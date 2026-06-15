import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Recipe from "@/models/Recipe";
import Menu from "@/models/Menu";
import { deleteImage } from "@/lib/cloudinary";
import { recipeSchema } from "@/lib/validations/recipe.schema";
import { auth } from "@/lib/auth";

// GET /api/recipes/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const recipe = await Recipe.findById(id).lean();
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  return NextResponse.json({ recipe });
}

// PUT /api/recipes/[id]
// Body is JSON; if a new image was uploaded directly to Cloudinary, pass thumbnailUrl + thumbnailPublicId
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const existing = await Recipe.findById(id);
  if (!existing) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  if (existing.author && existing.author.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { thumbnailUrl, thumbnailPublicId, translations, ...rest } = body;

    const parsed = recipeSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { ...parsed.data };

    // Normalise source: empty string → null so the detail page can show/hide it correctly
    update.source = update.source?.trim() || null;

    // Claim authorless (legacy) recipe for the editing user
    if (!existing.author) {
      update.author = session.user.id;
    }

    if (translations !== undefined) {
      update.translations = translations;
    }

    // Only update thumbnail if a new one was uploaded
    if (thumbnailUrl && thumbnailPublicId) {
      await deleteImage(existing.thumbnail.publicId);
      update.thumbnail = { url: thumbnailUrl, publicId: thumbnailPublicId };
    }

    // Use explicit $set to avoid any ambiguity with Mongoose's plain-object update handling
    const recipe = await Recipe.findByIdAndUpdate(id, { $set: update }, { new: true });
    return NextResponse.json({ recipe });
  } catch (err) {
    console.error("PUT /api/recipes/[id] error:", err);
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 });
  }
}

// DELETE /api/recipes/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const recipe = await Recipe.findById(id);
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  if (recipe.author && recipe.author.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await Menu.updateMany({}, { $pull: { "days.$[].meals": { recipeId: id } } });
    await deleteImage(recipe.thumbnail.publicId);
    await Recipe.findByIdAndDelete(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/recipes/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete recipe" }, { status: 500 });
  }
}
