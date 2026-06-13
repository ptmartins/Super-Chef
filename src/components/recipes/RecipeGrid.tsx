"use client";
import type { IRecipe } from "@/types";
import { RecipeCard } from "./RecipeCard";
import { EmptyState } from "@/components/common/EmptyState";
import { BookOpen, Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface RecipeGridProps {
  recipes: IRecipe[];
  favoritedIds?: Set<string>;
  view?: string;
}

export function RecipeGrid({ recipes, favoritedIds, view }: RecipeGridProps) {
  const t = useTranslation();

  if (recipes.length === 0) {
    if (view === "favorites") {
      return (
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title={t("recipe.empty.noFavorites")}
          description={t("recipe.empty.noFavoritesDesc")}
          action={
            <Button asChild variant="outline">
              <Link href="/recipes">{t("recipe.empty.browseAll")}</Link>
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={<BookOpen className="h-8 w-8" />}
        title={t("recipe.empty.noRecipes")}
        description={t("recipe.empty.noRecipesDesc")}
        action={
          <Button asChild>
            <Link href="/recipes/new">{t("recipe.empty.addFirst")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe, i) => (
        <RecipeCard
          key={recipe._id}
          recipe={recipe}
          index={i}
          isFavorited={favoritedIds ? favoritedIds.has(recipe._id) : undefined}
        />
      ))}
    </div>
  );
}
