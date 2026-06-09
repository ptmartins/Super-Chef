"use client";
import type { IRecipe } from "@/types";
import { RecipeCard } from "./RecipeCard";
import { EmptyState } from "@/components/common/EmptyState";
import { BookOpen, Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RecipeGridProps {
  recipes: IRecipe[];
  favoritedIds?: Set<string>;
  view?: string;
}

export function RecipeGrid({ recipes, favoritedIds, view }: RecipeGridProps) {
  if (recipes.length === 0) {
    if (view === "favorites") {
      return (
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title="No favorites yet"
          description="Heart a recipe to save it here for quick access."
          action={
            <Button asChild variant="outline">
              <Link href="/recipes">Browse all recipes</Link>
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={<BookOpen className="h-8 w-8" />}
        title="No recipes found"
        description="Try adjusting your filters or search terms, or be the first to add a recipe."
        action={
          <Button asChild>
            <Link href="/recipes/new">Add Your First Recipe</Link>
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
