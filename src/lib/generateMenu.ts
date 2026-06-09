import type { IRecipe, MealType, MenuDay, MealSlot } from "@/types";
import { getMenuDays } from "@/lib/utils";
import { aggregateIngredients } from "@/lib/aggregateIngredients";
import Recipe from "@/models/Recipe";

interface GenerateMenuOptions {
  type: "weekly" | "biweekly" | "monthly";
  startDate: Date;
  mealsPerDay: MealType[];
  filters?: {
    categories?: string[];
    maxTime?: number;
    difficulty?: string[];
    tags?: string[];
  };
  favoriteIds?: string[];
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function generateMenuDays(options: GenerateMenuOptions): Promise<{
  days: MenuDay[];
  shoppingList: ReturnType<typeof aggregateIngredients>;
}> {
  const { type, startDate, mealsPerDay, filters, favoriteIds } = options;
  const numDays = getMenuDays(type);

  // Build base query filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseFilter: Record<string, any> = {};
  if (filters?.categories?.length) baseFilter.categories = { $in: filters.categories };
  if (filters?.maxTime) baseFilter.estimatedTime = { $lte: filters.maxTime };
  if (filters?.difficulty?.length) baseFilter.difficulty = { $in: filters.difficulty };
  if (filters?.tags?.length) baseFilter.tags = { $in: filters.tags };
  if (favoriteIds?.length) baseFilter._id = { $in: favoriteIds };

  // Fetch recipe pools per meal type
  const pools: Record<MealType, IRecipe[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };

  for (const mealType of mealsPerDay) {
    const recipes = await Recipe.find({
      ...baseFilter,
      suitableFor: { $in: [mealType] },
    }).lean();
    pools[mealType] = recipes as unknown as IRecipe[];
  }

  // Validate pools
  for (const mealType of mealsPerDay) {
    if (pools[mealType].length === 0) {
      throw new Error(`Not enough recipes suitable for ${mealType}. Please add more recipes first.`);
    }
  }

  // Shuffle pools
  const shuffled: Record<MealType, IRecipe[]> = {
    breakfast: fisherYates(pools.breakfast),
    lunch: fisherYates(pools.lunch),
    dinner: fisherYates(pools.dinner),
  };

  const pointers: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0 };
  const lastUsed: Record<MealType, string | null> = { breakfast: null, lunch: null, dinner: null };

  const days: MenuDay[] = [];

  for (let i = 0; i < numDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const meals: MealSlot[] = [];

    for (const mealType of mealsPerDay) {
      const pool = shuffled[mealType];
      let recipe = pool[pointers[mealType] % pool.length];

      // Anti-consecutive-repeat guard
      if (
        recipe._id.toString() === lastUsed[mealType] &&
        pool.length > 1
      ) {
        pointers[mealType]++;
        recipe = pool[pointers[mealType] % pool.length];
      }

      meals.push({
        type: mealType,
        recipeId: recipe._id.toString(),
        recipeTitle: recipe.title,
        recipeThumbnail: recipe.thumbnail.url,
        servings: recipe.servings,
      });

      lastUsed[mealType] = recipe._id.toString();
      pointers[mealType]++;
    }

    days.push({
      dayIndex: i,
      date: date.toISOString(),
      meals,
    });
  }

  // Collect all unique recipe IDs
  const recipeIds = [...new Set(days.flatMap((d) => d.meals.map((m) => m.recipeId)))];
  const recipes = await Recipe.find({ _id: { $in: recipeIds } }).lean();
  const recipeMap = new Map<string, IRecipe>(
    (recipes as unknown as IRecipe[]).map((r) => [r._id.toString(), r])
  );

  const shoppingList = aggregateIngredients(days, recipeMap);

  return { days, shoppingList };
}
