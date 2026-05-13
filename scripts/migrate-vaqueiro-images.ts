/**
 * Migrate existing Vaqueiro thumbnails from vaqueiro.pt URLs to Cloudinary.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/migrate-vaqueiro-images.ts
 *
 * Options (env vars):
 *   DRY_RUN=1   — parse and log without writing to DB or uploading
 *   LIMIT=50    — stop after N recipes
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";

const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT) : Infinity;

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI && !DRY_RUN) {
  console.error("❌  MONGODB_URI not set");
  process.exit(1);
}

// Inline schema (same as scrape script for compatibility)
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

async function main() {
  if (DRY_RUN) {
    console.log("🔍 DRY RUN — nothing will be written to the database or uploaded.\n");
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI!);
  console.log("✅ Connected\n");

  // Find recipes that still point to vaqueiro.pt
  const candidates = await Recipe.find({
    "thumbnail.url": { $regex: "vaqueiro\\.pt", $options: "i" },
  }).lean();

  console.log(`Found ${candidates.length} recipes with vaqueiro.pt thumbnails\n`);

  let migrated = 0;
  let failed = 0;
  let skipped = 0;

  const { uploadImage } = DRY_RUN ? { uploadImage: null } : await import("../src/lib/cloudinary.js");

  for (const raw of candidates.slice(0, LIMIT)) {
    const recipe = raw as unknown as {
      _id: mongoose.Types.ObjectId;
      title: string;
      thumbnail: { url: string; publicId: string };
      slug: string;
    };

    const originalUrl = recipe.thumbnail.url;
    console.log(`📷 ${recipe.title}`);
    console.log(`   current: ${originalUrl}`);

    if (DRY_RUN) {
      console.log(`   [dry] would download, upload to Cloudinary, and update DB\n`);
      migrated++;
      continue;
    }

    const buffer = await fetchImageBuffer(originalUrl);
    if (!buffer) {
      console.log(`   ⚠️  Image download failed, skipping\n`);
      failed++;
      continue;
    }

    try {
      const uploaded = await uploadImage!(buffer, "super-chef/recipes/vaqueiro");
      await Recipe.updateOne(
        { _id: recipe._id },
        {
          $set: {
            "thumbnail.url": uploaded.url,
            "thumbnail.publicId": uploaded.publicId,
          },
        }
      );
      console.log(`   ✅ migrated → ${uploaded.url}\n`);
      migrated++;
    } catch (err) {
      console.log(`   ⚠️  Upload/DB update failed: ${(err as Error).message}\n`);
      failed++;
    }
  }

  console.log(`\n🎉 Done — migrated: ${migrated}, failed: ${failed}, skipped: ${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
