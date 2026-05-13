/**
 * Scrape recipes from vaqueiro.pt and insert into MongoDB.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/scrape-vaqueiro.ts
 *
 * Options (env vars):
 *   DRY_RUN=1   — parse and log without writing to DB
 *   LIMIT=50    — stop after N recipes total (useful for testing)
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { JSDOM } from "jsdom";

const BASE_URL = "https://www.vaqueiro.pt";
const DELAY_MS = 450;
const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT) : Infinity;

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI && !DRY_RUN) {
  console.error("❌  MONGODB_URI not set");
  process.exit(1);
}

// ── Mongoose model (inline, same pattern as seed.ts) ──────────────────────────

const IngredientSchema = new mongoose.Schema(
  { name: String, amount: Number, unit: String },
  { _id: false }
);
const StepSchema = new mongoose.Schema(
  { order: Number, description: String },
  { _id: false }
);
const RecipeSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    thumbnail: { url: String, publicId: String },
    ingredients: [IngredientSchema],
    steps: [StepSchema],
    estimatedTime: Number,
    difficulty: String,
    categories: [String],
    servings: Number,
    tags: [String],
    suitableFor: [String],
    slug: { type: String, unique: true },
  },
  { timestamps: true }
);
const Recipe = mongoose.models.Recipe ?? mongoose.model("Recipe", RecipeSchema);

// ── Category / metadata maps ───────────────────────────────────────────────────

// Vaqueiro URL slug → app category enum values
const CATEGORIES: Record<string, string[]> = {
  "sopas":                  ["soup"],
  "saladas":                ["salad"],
  "carne":                  ["meat"],
  "peixe":                  ["fish"],
  "massas":                 ["pasta"],
  "arroz":                  ["snack"],
  "legumes":                ["vegetarian"],
  "doces-e-sobremesas":     ["dessert"],
  "entradas-e-petiscos":    ["snack"],
  "paes":                   ["snack"],
  "pizzas":                 ["italian"],
  "outros-acompanhamentos": ["snack"],
};

const SUITABLE_FOR: Record<string, string[]> = {
  "soup":       ["lunch", "dinner"],
  "salad":      ["lunch", "dinner"],
  "meat":       ["lunch", "dinner"],
  "fish":       ["lunch", "dinner"],
  "pasta":      ["lunch", "dinner"],
  "snack":      ["lunch"],
  "vegetarian": ["lunch", "dinner"],
  "dessert":    ["dinner"],
  "italian":    ["lunch", "dinner"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; recipe-scraper/1.0)" },
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok ? res.text() : null;
  } catch {
    return null;
  }
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; recipe-scraper/1.0)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function mapUnit(raw: string): string {
  const u = raw.toLowerCase().trim();
  const map: Record<string, string> = {
    g: "g", kg: "kg", ml: "ml", l: "l", dl: "ml", cl: "ml",
    "colher de sopa": "tbsp", "colheres de sopa": "tbsp",
    "colher de chá": "tsp",   "colheres de chá": "tsp",
    "chávena": "cup",         "chávenas": "cup",
    "lata": "can",            "latas": "can",
    "pacote": "package",      "pacotes": "package",
    "fatia": "slice",         "fatias": "slice",
    "dente": "clove",         "dentes": "clove",
    "pitada": "pinch",        "pitadas": "pinch",
    "molho": "bunch",         "molhos": "bunch",
  };
  return map[u] ?? "piece";
}

function parseIngredient(raw: string): { name: string; amount: number; unit: string } | null {
  const text = raw.replace(/\*+$/, "").replace(/^[±≈~\s]+/, "").trim();
  if (!text) return null;

  // number + known unit + name
  const withUnit = text.match(
    /^(\d+(?:[.,]\d+)?)\s+(colheres?\s+de\s+sopa|colheres?\s+de\s+chá|chávenas?|kg|ml|dl|cl|latas?|pacotes?|fatias?|dentes?|pitadas?|molhos?|g|l)\s+(?:de\s+)?(.+)$/i
  );
  if (withUnit) {
    return {
      amount: parseFloat(withUnit[1].replace(",", ".")),
      unit: mapUnit(withUnit[2]),
      name: withUnit[3].trim(),
    };
  }

  // number + name (no unit)
  const noUnit = text.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (noUnit) {
    return {
      amount: parseFloat(noUnit[1].replace(",", ".")),
      unit: "piece",
      name: noUnit[2].replace(/^de\s+/i, "").trim(),
    };
  }

  // plain name — no quantity
  return { amount: 1, unit: "piece", name: text };
}

function parseDifficulty(text: string): "easy" | "medium" | "hard" {
  const t = text.toLowerCase();
  if (/f[áa]cil/.test(t)) return "easy";
  if (/dif[íi]cil/.test(t)) return "hard";
  return "medium";
}

// ── Listing page scraper ───────────────────────────────────────────────────────

async function getListingPage(
  categorySlug: string,
  page: number
): Promise<{ urls: string[]; lastPage: number }> {
  const url =
    page === 1
      ? `${BASE_URL}/receitas/${categorySlug}`
      : `${BASE_URL}/receitas/${categorySlug}?recipes=${page}`;

  const html = await fetchHtml(url);
  if (!html) return { urls: [], lastPage: 1 };

  const doc = new JSDOM(html).window.document;

  const urls = [
    ...new Set(
      Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href^="/recipes/"]')).map(
        (a) => `${BASE_URL}${a.getAttribute("href")}`
      )
    ),
  ];

  const pageNums = Array.from(
    doc.querySelectorAll<HTMLAnchorElement>('a[href*="?recipes="]')
  )
    .map((a) => parseInt(a.getAttribute("href")?.match(/\?recipes=(\d+)/)?.[1] ?? "0"))
    .filter((n) => n > 0);

  const lastPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;

  return { urls, lastPage };
}

// ── Recipe detail scraper ──────────────────────────────────────────────────────

async function scrapeRecipe(
  url: string,
  appCategories: string[]
): Promise<Record<string, unknown> | null> {
  const html = await fetchHtml(url);
  if (!html) return null;

  const doc = new JSDOM(html).window.document;

  const title = doc.querySelector("h1")?.textContent?.trim();
  if (!title) return null;

  // Thumbnail — img whose alt contains "recipe image"
  const imgEl = Array.from(doc.querySelectorAll("img")).find((img) =>
    img.getAttribute("alt")?.toLowerCase().includes("recipe image")
  );
  const rawSrc = imgEl?.getAttribute("src")?.split("?")[0];
  if (!rawSrc) return null;
  const thumbnailUrl = `${BASE_URL}${rawSrc}?w=800`;

  // Locate sections by heading text
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));

  function nextListAfter(keyword: RegExp, tag: string): Element | null {
    const heading = headings.find((h) => keyword.test(h.textContent ?? ""));
    if (!heading) return null;
    let el = heading.nextElementSibling;
    while (el && el.tagName.toUpperCase() !== tag.toUpperCase()) {
      el = el.nextElementSibling;
    }
    return el ?? null;
  }

  // Ingredients
  const ingredientsUl = nextListAfter(/ingredientes/i, "UL");
  const ingredients = Array.from(ingredientsUl?.querySelectorAll("li") ?? [])
    .map((li) => parseIngredient(li.textContent?.trim() ?? ""))
    .filter((i): i is NonNullable<typeof i> => i !== null && i.name.length > 0);

  if (ingredients.length === 0) return null;

  // Steps
  const stepsOl = nextListAfter(/prepara[çc][aã]o/i, "OL");
  const steps = Array.from(stepsOl?.querySelectorAll("li") ?? [])
    .map((li) => li.textContent?.trim() ?? "")
    .filter((s) => s.length > 0)
    .map((s, i) => ({ order: i + 1, description: s }));

  if (steps.length === 0) return null;

  // Metadata — scan full body text
  const bodyText = doc.body.textContent ?? "";

  const estimatedTime = parseInt(bodyText.match(/(\d+)\s*minutos?/i)?.[1] ?? "30");
  const servings = parseInt(bodyText.match(/(\d+)\s*porções?/i)?.[1] ?? "4");
  const diffRaw =
    bodyText.match(/dificuldade\s+(fácil|médio|média|normal|difícil)/i)?.[1] ??
    bodyText.match(/\b(fácil|difícil)\b/i)?.[1] ??
    "medium";
  const difficulty = parseDifficulty(diffRaw);

  // Description: first step capped at 500 chars
  const description = steps[0].description.slice(0, 500);

  const suitableFor = SUITABLE_FOR[appCategories[0]] ?? ["lunch", "dinner"];
  const urlSlug = url.split("/recipes/")[1] ?? "";
  const publicId = `vaqueiro/${urlSlug}`;

  return {
    title,
    description,
    thumbnail: { url: thumbnailUrl, publicId },
    ingredients,
    steps,
    estimatedTime,
    difficulty,
    categories: appCategories,
    servings,
    tags: [],
    suitableFor,
    slug: urlSlug,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) {
    console.log("🔍 DRY RUN — nothing will be written to the database.\n");
  } else {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("✅ Connected\n");
  }

  const seen = new Set<string>();
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  outer: for (const [categorySlug, appCategories] of Object.entries(CATEGORIES)) {
    console.log(`\n📂 ${categorySlug}  →  [${appCategories.join(", ")}]`);

    // Discover total pages first, then process page-by-page
    const { urls: firstPageUrls, lastPage } = await getListingPage(categorySlug, 1);
    console.log(`   ${lastPage} page(s)`);
    await sleep(DELAY_MS);

    const pageUrlBatches: string[][] = [firstPageUrls];

    for (let page = 2; page <= lastPage; page++) {
      const { urls } = await getListingPage(categorySlug, page);
      pageUrlBatches.push(urls);
      await sleep(DELAY_MS);
    }

    for (const urls of pageUrlBatches) {
      for (const recipeUrl of urls) {
        if (inserted >= LIMIT) break outer;
        if (seen.has(recipeUrl)) { skipped++; continue; }
        seen.add(recipeUrl);

        const urlSlug = recipeUrl.split("/recipes/")[1] ?? "";

        if (!DRY_RUN) {
          const exists = await Recipe.exists({ slug: urlSlug });
          if (exists) { skipped++; continue; }
        }

        const data = await scrapeRecipe(recipeUrl, appCategories);
        await sleep(DELAY_MS);

        if (!data) {
          failed++;
          continue;
        }

        if (!DRY_RUN) {
          const imgBuffer = await fetchImageBuffer((data.thumbnail as { url: string }).url);
          if (!imgBuffer) {
            console.log(`   ⚠️  Image download failed for ${data.title}, skipping`);
            failed++;
            continue;
          }
          const { uploadImage } = await import("../src/lib/cloudinary.js");
          try {
            const uploaded = await uploadImage(imgBuffer, "super-chef/recipes/vaqueiro");
            (data as Record<string, unknown>).thumbnail = { url: uploaded.url, publicId: uploaded.publicId };
          } catch {
            console.log(`   ⚠️  Cloudinary upload failed for ${data.title}, skipping`);
            failed++;
            continue;
          }
        }

        if (DRY_RUN) {
          console.log(`   [dry] ${data.title} — ${(data.ingredients as unknown[]).length} ingredients, ${(data.steps as unknown[]).length} steps`);
        } else {
          try {
            await Recipe.create(data);
            console.log(`   ✅ [${inserted + 1}] ${data.title}`);
          } catch {
            skipped++;
            continue;
          }
        }
        inserted++;
      }
    }
  }

  console.log(`\n🎉 Done — inserted: ${inserted}, skipped/duplicate: ${skipped}, failed: ${failed}`);

  if (!DRY_RUN) await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
