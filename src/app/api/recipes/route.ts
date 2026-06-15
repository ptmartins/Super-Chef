import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Recipe from "@/models/Recipe";
import User from "@/models/User";
import { uniqueSlug } from "@/lib/slugify";
import { recipeSchema } from "@/lib/validations/recipe.schema";
import { auth } from "@/lib/auth";
import { translateRecipeToPortuguese } from "@/lib/translate";

// POST /api/recipes — create new recipe
// Body is JSON (image already uploaded directly to Cloudinary from the browser)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await req.json();

    const { thumbnailUrl, thumbnailPublicId, ...rest } = body;

    if (!thumbnailUrl || !thumbnailPublicId) {
      return NextResponse.json({ error: "Thumbnail is required" }, { status: 400 });
    }

    const parsed = recipeSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    const slug = await uniqueSlug(parsed.data.title, async (s) => {
      const exists = await Recipe.findOne({ slug: s });
      return !!exists;
    });

    const pt = await translateRecipeToPortuguese({
      title: parsed.data.title,
      description: parsed.data.description,
      ingredients: parsed.data.ingredients.map((i) => ({ name: i.name })),
      steps: parsed.data.steps.map((s) => ({ description: s.description })),
      tags: parsed.data.tags,
    });

    const recipe = await Recipe.create({
      ...parsed.data,
      thumbnail: { url: thumbnailUrl, publicId: thumbnailPublicId },
      slug,
      author: session.user.id,
      source: parsed.data.source?.trim() || session.user.name || null,
      ...(pt && { translations: { pt } }),
    });

    await User.updateOne(
      { _id: session.user.id },
      { $addToSet: { favorites: recipe._id } }
    );

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/recipes error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/recipes — paginated, filtered list
export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const maxTime = searchParams.get("maxTime");
  const tags = searchParams.get("tags") ?? "";
  const suitableFor = searchParams.get("suitableFor") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10)));
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (search) query.$text = { $search: search };
  if (category) query.categories = { $in: [category] };
  if (difficulty) query.difficulty = difficulty;
  if (maxTime) query.estimatedTime = { $lte: parseInt(maxTime, 10) };
  if (tags) query.tags = { $in: tags.split(",").map((t) => t.trim()) };
  if (suitableFor) query.suitableFor = { $in: [suitableFor] };

  const [recipes, total] = await Promise.all([
    Recipe.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "name")
      .lean(),
    Recipe.countDocuments(query),
  ]);

  return NextResponse.json({
    recipes,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
