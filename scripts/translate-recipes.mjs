/**
 * One-time migration: translate all existing recipes to PT-PT using DeepL API.
 *
 * Usage:
 *   DEEPL_API_KEY=your_key MONGODB_URI=your_uri node scripts/translate-recipes.mjs
 *
 * Requires a free DeepL API key: https://www.deepl.com/pro-api
 * Free tier: 500,000 characters/month — sufficient for most recipe collections.
 *
 * Only processes recipes that don't already have translations.pt set.
 */

import mongoose from "mongoose";

const { DEEPL_API_KEY, MONGODB_URI } = process.env;

if (!DEEPL_API_KEY || !MONGODB_URI) {
  console.error("❌  Required env vars: DEEPL_API_KEY and MONGODB_URI");
  process.exit(1);
}

// ── DeepL ────────────────────────────────────────────────────────────────────

async function translate(texts) {
  if (!texts.length) return [];
  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts, target_lang: "PT-PT", source_lang: "EN" }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepL ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.translations.map((t) => t.text);
}

// ── MongoDB ───────────────────────────────────────────────────────────────────

await mongoose.connect(MONGODB_URI);
const Recipe = mongoose.model("Recipe", new mongoose.Schema({}, { strict: false }));

const recipes = await Recipe.find({ "translations.pt": { $exists: false } }).lean();
console.log(`Found ${recipes.length} recipe(s) without Portuguese translations.\n`);

let ok = 0;
let fail = 0;

for (const recipe of recipes) {
  try {
    const ingredientNames = (recipe.ingredients ?? []).map((i) => i.name ?? "");
    const stepDescs = (recipe.steps ?? []).map((s) => s.description ?? "");
    const tags = recipe.tags ?? [];

    const batch = [
      recipe.title ?? "",
      recipe.description ?? "",
      ...ingredientNames,
      ...stepDescs,
      ...tags,
    ];

    const translated = await translate(batch);

    let idx = 0;
    const ptTitle = translated[idx++];
    const ptDescription = translated[idx++];
    const ptIngredients = ingredientNames.map(() => ({ name: translated[idx++] }));
    const ptSteps = stepDescs.map(() => ({ description: translated[idx++] }));
    const ptTags = tags.map(() => translated[idx++]);

    await Recipe.updateOne(
      { _id: recipe._id },
      {
        $set: {
          "translations.pt": {
            title: ptTitle,
            description: ptDescription,
            ingredients: ptIngredients,
            steps: ptSteps,
            tags: ptTags,
          },
        },
      }
    );

    console.log(`✓  ${recipe.title}`);
    ok++;

    // Small delay to stay within DeepL rate limits
    await new Promise((r) => setTimeout(r, 150));
  } catch (err) {
    console.error(`✗  ${recipe.title}: ${err.message}`);
    fail++;
  }
}

await mongoose.disconnect();
console.log(`\nDone — ${ok} translated, ${fail} failed.`);
