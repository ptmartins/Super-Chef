import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, UNITS } from "@/types";

export interface ImportedRecipe {
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount: number; unit: string }>;
  steps: Array<{ order: number; description: string }>;
  estimatedTime: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  categories: string[];
  suitableFor: string[];
  tags: string[];
  source: string;
  thumbnailUrl?: string;
}

const client = new Anthropic();
const UNIT_LIST = UNITS.join(",");
const CATEGORY_LIST = CATEGORIES.join(",");

// Parses ISO 8601 durations like PT1H30M → 90 (minutes)
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? "0", 10) * 60) + parseInt(match[2] ?? "0", 10);
}

// Strips HTML tags and normalises whitespace
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Extracts the first integer from strings like "4 servings" or "serves 4–6"
function parseServings(raw: string | number | undefined): number {
  if (typeof raw === "number") return Math.max(1, raw);
  const match = String(raw ?? "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 4;
}

// Strips ad wrappers, nav, scripts, etc., and truncates for Claude
function cleanHtmlForClaude(html: string): string {
  let cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  cleaned = stripHtml(cleaned);
  return cleaned.slice(0, 12000);
}

function parseJsonFromClaude(raw: string): unknown {
  const jsonStr = raw
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return JSON.parse(jsonStr);
}

// Calls Claude Haiku to parse an array of raw ingredient strings into structured objects
async function parseIngredients(
  rawList: string[]
): Promise<Array<{ name: string; amount: number; unit: string }>> {
  if (rawList.length === 0) return [];

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `Parse the array of ingredient strings into structured JSON.
Return ONLY a JSON array of objects with exactly these keys:
- name (string): the ingredient name, without quantity or unit
- amount (number): the numeric quantity, use 1 if unknown
- unit (string): must be exactly one of: ${UNIT_LIST}

No markdown, no explanation, no extra keys.`,
    messages: [{ role: "user", content: JSON.stringify(rawList) }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
  return parseJsonFromClaude(raw) as Array<{ name: string; amount: number; unit: string }>;
}

// Finds first schema.org Recipe JSON-LD block and maps it to ImportedRecipe
function extractFromSchemaOrg(html: string, url: string): ImportedRecipe | null {
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html)) !== null) {
    let json: unknown;
    try {
      json = JSON.parse(match[1]);
    } catch {
      continue;
    }

    // Unwrap @graph arrays
    const nodes: unknown[] = Array.isArray(json)
      ? json
      : (json as Record<string, unknown>)["@graph"]
        ? ((json as Record<string, unknown>)["@graph"] as unknown[])
        : [json];

    const recipe = nodes.find(
      (n) =>
        n &&
        typeof n === "object" &&
        ((n as Record<string, unknown>)["@type"] === "Recipe" ||
          (Array.isArray((n as Record<string, unknown>)["@type"]) &&
            ((n as Record<string, unknown>)["@type"] as string[]).includes("Recipe")))
    ) as Record<string, unknown> | undefined;

    if (!recipe) continue;

    const title = String(recipe.name ?? "").trim();
    if (!title) continue;

    // Description — strip HTML tags
    const description = stripHtml(String(recipe.description ?? "")).slice(0, 500);

    // Raw ingredient strings — we'll parse with Claude later
    const rawIngredients: string[] = Array.isArray(recipe.recipeIngredient)
      ? (recipe.recipeIngredient as unknown[]).map((i) => String(i))
      : [];

    // Steps
    const rawSteps: unknown[] = Array.isArray(recipe.recipeInstructions)
      ? (recipe.recipeInstructions as unknown[])
      : [];
    const steps = rawSteps.map((s, i) => ({
      order: i + 1,
      description: stripHtml(
        typeof s === "string" ? s : String((s as Record<string, unknown>).text ?? s)
      ),
    }));

    if (rawIngredients.length === 0 || steps.length === 0) continue;

    // Time — totalTime preferred, else prepTime + cookTime
    let estimatedTime = 0;
    if (recipe.totalTime) {
      estimatedTime = parseDuration(String(recipe.totalTime));
    } else {
      estimatedTime =
        parseDuration(String(recipe.prepTime ?? "")) +
        parseDuration(String(recipe.cookTime ?? ""));
    }
    if (estimatedTime <= 0) estimatedTime = 30;

    const servings = parseServings(recipe.recipeYield as string | number | undefined);

    // Thumbnail
    let thumbnailUrl: string | undefined;
    if (typeof recipe.image === "string") {
      thumbnailUrl = recipe.image;
    } else if (Array.isArray(recipe.image) && recipe.image.length > 0) {
      const first = recipe.image[0];
      thumbnailUrl = typeof first === "string" ? first : String((first as Record<string, unknown>).url ?? "");
    } else if (recipe.image && typeof recipe.image === "object") {
      thumbnailUrl = String((recipe.image as Record<string, unknown>).url ?? "");
    }

    // Tags
    const tags: string[] = recipe.keywords
      ? String(recipe.keywords)
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 8)
      : [];

    return {
      title,
      description,
      ingredients: rawIngredients as unknown as Array<{ name: string; amount: number; unit: string }>,
      steps,
      estimatedTime,
      servings,
      difficulty: "medium",
      categories: [],
      suitableFor: [],
      tags,
      source: url.slice(0, 200),
      thumbnailUrl: thumbnailUrl || undefined,
      // Flag that ingredients are still raw strings to be parsed
      _rawIngredients: rawIngredients,
    } as ImportedRecipe & { _rawIngredients?: string[] };
  }

  return null;
}

// Falls back to Claude when schema.org is absent
async function extractWithClaude(cleanedText: string, url: string): Promise<ImportedRecipe> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: `Extract the recipe from this webpage text and return ONLY a JSON object (no markdown, no explanation) with exactly this structure:
{
  "title": string,
  "description": string (1-2 sentence summary, max 500 chars),
  "ingredients": [{ "name": string, "amount": number (use 1 if unknown), "unit": string (must be exactly one of: ${UNIT_LIST}) }],
  "steps": [{ "order": number (starting at 1), "description": string }],
  "estimatedTime": number (minutes as integer, default 30),
  "servings": number (integer, default 4),
  "difficulty": "easy" | "medium" | "hard",
  "categories": string[] (choose only from: ${CATEGORY_LIST}),
  "suitableFor": string[] (choose from: breakfast,lunch,dinner — at least one),
  "tags": string[] (2-5 descriptive lowercase tags)
}`,
    messages: [{ role: "user", content: cleanedText }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  const data = parseJsonFromClaude(raw) as Record<string, unknown>;

  const validCategories = CATEGORIES as readonly string[];
  const validSuitableFor = ["breakfast", "lunch", "dinner"];

  return {
    title: String(data.title ?? "").slice(0, 120),
    description: String(data.description ?? "").slice(0, 500),
    ingredients: (data.ingredients as Array<{ name: string; amount: number; unit: string }>) ?? [],
    steps: (data.steps as Array<{ order: number; description: string }>) ?? [],
    estimatedTime: Math.max(1, Math.min(1440, Number(data.estimatedTime) || 30)),
    servings: Math.max(1, Math.min(100, Number(data.servings) || 4)),
    difficulty: (["easy", "medium", "hard"].includes(data.difficulty as string)
      ? data.difficulty
      : "medium") as "easy" | "medium" | "hard",
    categories: ((data.categories as string[]) ?? []).filter((c) => validCategories.includes(c)),
    suitableFor: ((data.suitableFor as string[]) ?? []).filter((s) => validSuitableFor.includes(s)),
    tags: ((data.tags as string[]) ?? []).slice(0, 8),
    source: url.slice(0, 200),
  };
}

export async function extractRecipeFromUrl(
  url: string
): Promise<{ data: ImportedRecipe; method: "schema.org" | "claude-ai" }> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  // Cap at 2MB
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const MAX_BYTES = 2 * 1024 * 1024;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      if (totalBytes > MAX_BYTES) { reader.cancel(); break; }
      chunks.push(value);
    }
  }

  const html = new TextDecoder().decode(
    chunks.reduce((acc, chunk) => {
      const merged = new Uint8Array(acc.length + chunk.length);
      merged.set(acc);
      merged.set(chunk, acc.length);
      return merged;
    }, new Uint8Array(0))
  );

  // Tier 1: schema.org
  const schemaResult = extractFromSchemaOrg(html, url) as (ImportedRecipe & { _rawIngredients?: string[] }) | null;
  if (schemaResult) {
    const rawIngredients = schemaResult._rawIngredients ?? [];
    delete (schemaResult as unknown as Record<string, unknown>)._rawIngredients;

    if (rawIngredients.length > 0) {
      try {
        schemaResult.ingredients = await parseIngredients(rawIngredients);
      } catch {
        // If ingredient parsing fails, leave ingredients empty — user can fill in
        schemaResult.ingredients = [];
      }
    }

    return { data: schemaResult, method: "schema.org" };
  }

  // Tier 2: Claude full extraction
  const cleaned = cleanHtmlForClaude(html);
  const data = await extractWithClaude(cleaned, url);
  return { data, method: "claude-ai" };
}
