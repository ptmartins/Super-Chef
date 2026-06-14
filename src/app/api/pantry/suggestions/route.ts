import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Recipe from "@/models/Recipe";

function matches(pantryItem: string, ingredientName: string): boolean {
  const p = pantryItem.toLowerCase().trim();
  const ing = ingredientName.toLowerCase().trim();
  return ing.includes(p) || p.includes(ing);
}

// GET /api/pantry/suggestions
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findById(session.user.id).select("pantry").lean() as any;
  const pantry: string[] = user?.pantry ?? [];

  if (pantry.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const recipes = await Recipe.find(
    {},
    { title: 1, thumbnail: 1, ingredients: 1, slug: 1, estimatedTime: 1, difficulty: 1 }
  ).lean();

  const suggestions = recipes
    .map((recipe) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ingredients = (recipe as any).ingredients as Array<{ name: string }>;
      const total = ingredients.length;
      if (total === 0) return null;

      const matchedIngredients = ingredients.filter((ing) =>
        pantry.some((p) => matches(p, ing.name))
      );
      const missingIngredients = ingredients
        .filter((ing) => !pantry.some((p) => matches(p, ing.name)))
        .map((ing) => ing.name);

      const score = matchedIngredients.length / total;
      if (score === 0) return null;

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _id: (recipe as any)._id.toString(),
        title: recipe.title,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thumbnail: (recipe as any).thumbnail,
        matchedCount: matchedIngredients.length,
        totalCount: total,
        score,
        missingIngredients: missingIngredients.slice(0, 5),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        estimatedTime: (recipe as any).estimatedTime,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        difficulty: (recipe as any).difficulty,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score)
    .slice(0, 24);

  return NextResponse.json({ suggestions });
}
