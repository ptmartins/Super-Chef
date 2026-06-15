"use client";
import { useState, Suspense } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecipeFilters } from "./RecipeFilters";
import { RecipeGrid } from "./RecipeGrid";
import { RecipePagination } from "./RecipePagination";
import { useTranslation } from "@/components/providers/LanguageProvider";
import type { IRecipe } from "@/types";

interface RecipesViewProps {
  recipes: IRecipe[];
  page: number;
  totalPages: number;
  total: number;
  favoritedIds?: string[];
  view: string;
}

export function RecipesView({ recipes, page, totalPages, total, favoritedIds, view }: RecipesViewProps) {
  const [filterOpen, setFilterOpen] = useState(true);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const t = useTranslation();

  const favSet = favoritedIds ? new Set(favoritedIds) : undefined;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors",
            filterOpen
              ? "bg-primary/10 text-primary border-primary/20"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("recipes.filterRecipes")}
          {filterOpen
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        <div className="flex rounded-xl border overflow-hidden">
          <button
            onClick={() => setLayout("grid")}
            title="Grid view"
            aria-label="Grid view"
            className={cn(
              "flex items-center justify-center h-9 w-9 transition-colors",
              layout === "grid"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setLayout("list")}
            title="List view"
            aria-label="List view"
            className={cn(
              "flex items-center justify-center h-9 w-9 transition-colors border-l border-border",
              layout === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-6 items-start">
        {filterOpen && (
          <div className="w-64 shrink-0">
            <div className="rounded-2xl border bg-card p-5">
              <Suspense>
                <RecipeFilters />
              </Suspense>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-6">
          <RecipeGrid
            recipes={recipes}
            favoritedIds={favSet}
            view={view}
            layout={layout}
          />
          <Suspense>
            <RecipePagination page={page} totalPages={totalPages} total={total} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
