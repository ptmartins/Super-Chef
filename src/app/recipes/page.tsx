export const dynamic = "force-dynamic";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import Recipe from "@/models/Recipe";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import type { IRecipe } from "@/types";
import { getT, type Locale } from "@/lib/i18n";
import { RecipeGrid } from "@/components/recipes/RecipeGrid";
import { RecipeFilters } from "@/components/recipes/RecipeFilters";
import { RecipePagination } from "@/components/recipes/RecipePagination";
import { RecipeGridSkeleton } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Recipes" };

interface PageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    difficulty?: string;
    maxTime?: string;
    tags?: string;
    suitableFor?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
    view?: string;
  }>;
}

async function fetchRecipes(
  params: Awaited<PageProps["searchParams"]>,
  favoritedIds: Set<string>
) {
  await connectDB();

  const search = params.search ?? "";
  const category = params.category ?? "";
  const difficulty = params.difficulty ?? "";
  const maxTime = params.maxTime;
  const tags = params.tags ?? "";
  const suitableFor = params.suitableFor ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 12;
  const sortBy = params.sortBy ?? "createdAt";
  const sortOrder = params.sortOrder === "asc" ? 1 : -1;
  const view = params.view ?? "all";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (search) query.$text = { $search: search };
  if (category) query.categories = { $in: [category] };
  if (difficulty) query.difficulty = difficulty;
  if (maxTime) query.estimatedTime = { $lte: parseInt(maxTime, 10) };
  if (tags) query.tags = { $in: tags.split(",").map((t) => t.trim()) };
  if (suitableFor) query.suitableFor = { $in: [suitableFor] };

  if (view === "favorites") {
    if (favoritedIds.size === 0) {
      return { recipes: [] as IRecipe[], total: 0, page: 1, totalPages: 0 };
    }
    query._id = { $in: Array.from(favoritedIds) };
  }

  const [recipes, total] = await Promise.all([
    Recipe.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "name")
      .lean(),
    Recipe.countDocuments(query),
  ]);

  return {
    recipes: JSON.parse(JSON.stringify(recipes)) as IRecipe[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export default async function RecipesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();
  const view = params.view ?? "all";

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value ?? "en") as Locale;
  const t = getT(locale);

  await connectDB();

  let favoritedIds = new Set<string>();
  if (session?.user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await User.findById(session.user.id).select("favorites").lean() as any;
    favoritedIds = new Set<string>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user?.favorites ?? []).map((id: any) => id.toString())
    );
  }

  const { recipes, total, page, totalPages } = await fetchRecipes(params, favoritedIds);

  const isFavoritesView = view === "favorites";
  const headerDescription = isFavoritesView
    ? total > 0
      ? `${total} ${total !== 1 ? t("recipes.saved") : t("recipes.saved1")}`
      : t("recipes.noFavorites")
    : total > 0
      ? `${total} ${total !== 1 ? t("recipes.collection") : t("recipes.collection1")}`
      : t("recipes.start");

  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">
            {isFavoritesView ? t("recipes.myFavorites") : t("recipes.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{headerDescription}</p>
        </div>
        <Button asChild>
          <Link href="/recipes/new">
            <Plus className="h-4 w-4 mr-1" />
            {t("recipes.newRecipe")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters */}
        <aside className="lg:w-64 shrink-0">
          <div className="rounded-2xl border bg-card p-5 sticky top-20">
            <p className="text-sm font-semibold mb-4">{t("recipes.filterRecipes")}</p>
            <Suspense>
              <RecipeFilters />
            </Suspense>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          <Suspense fallback={<RecipeGridSkeleton />}>
            <RecipeGrid
              recipes={recipes}
              favoritedIds={session?.user ? favoritedIds : undefined}
              view={view}
            />
          </Suspense>
          <Suspense>
            <RecipePagination page={page} totalPages={totalPages} total={total} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
