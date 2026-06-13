"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Search, SlidersHorizontal, X, Heart, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES, type Category } from "@/types";
import { getCategoryColor, cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "@/components/providers/LanguageProvider";

export function RecipeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { data: session } = useSession();

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const maxTime = parseInt(searchParams.get("maxTime") ?? "180", 10);
  const view = searchParams.get("view") ?? "all";

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams]
  );

  const clearAll = () => {
    startTransition(() => router.push(pathname));
  };

  const hasFilters = search || category || difficulty || searchParams.get("maxTime");
  const t = useTranslation();

  return (
    <div className="space-y-5">
      {/* View toggle — only for authenticated users */}
      {session && (
        <div className="flex rounded-xl border overflow-hidden text-xs font-medium">
          <button
            onClick={() => updateParam("view", null)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors",
              view !== "favorites"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <BookOpen className="h-3 w-3" />
            {t("recipes.all")}
          </button>
          <button
            onClick={() => updateParam("view", "favorites")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors",
              view === "favorites"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Heart className="h-3 w-3" />
            {t("recipes.myFavorites")}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t("recipes.searchPlaceholder")}
          defaultValue={search}
          onChange={(e) => updateParam("search", e.target.value || null)}
          className="pl-9"
        />
      </div>

      {/* Difficulty */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
          <SlidersHorizontal className="h-3 w-3" />
          {t("recipes.difficulty")}
        </p>
        <div className="flex gap-2">
          {(["easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => updateParam("difficulty", difficulty === d ? null : d)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                difficulty === d
                  ? d === "easy" ? "bg-emerald-500 text-white border-emerald-500"
                    : d === "medium" ? "bg-amber-500 text-white border-amber-500"
                    : "bg-red-500 text-white border-red-500"
                  : "border-border hover:border-primary/40 hover:bg-muted"
              )}
            >
              {t(`difficulty.${d}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Max time */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {t("recipes.maxTimeLabel")} {maxTime >= 180 ? t("recipes.maxTimeAny") : `${maxTime} ${t("recipes.min")}`}
        </p>
        <Slider
          min={15}
          max={180}
          step={15}
          value={[maxTime]}
          onValueChange={([v]) => updateParam("maxTime", v >= 180 ? null : v.toString())}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>15 {t("recipes.min")}</span>
          <span>{t("recipes.hrs")}</span>
        </div>
      </div>

      {/* Categories */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {t("recipes.category")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => updateParam("category", category === cat ? null : cat)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                category === cat
                  ? cn(getCategoryColor(cat as Category), "border-current ring-1 ring-current/30")
                  : "border-border hover:border-primary/40 bg-background hover:bg-muted"
              )}
            >
              {t(`category.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Clear */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="w-full text-muted-foreground">
          <X className="h-3.5 w-3.5 mr-1" />
          {t("recipes.clearFilters")}
        </Button>
      )}
    </div>
  );
}
