"use client";
import Image from "next/image";
import Link from "next/link";
import { Clock, Users, ChefHat, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import type { IRecipe } from "@/types";
import { formatTime, getDifficultyColor, getCategoryColor, cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { localizeRecipe } from "@/lib/i18n";

interface RecipeCardProps {
  recipe: IRecipe;
  index?: number;
  isFavorited?: boolean;
  layout?: "grid" | "list";
}

export function RecipeCard({ recipe, index = 0, isFavorited, layout = "grid" }: RecipeCardProps) {
  const { locale, t } = useLanguage();
  const r = localizeRecipe(recipe, locale);

  if (layout === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
      >
        <Link href={`/recipes/${r._id}`} className="group block">
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex">
            {/* Thumbnail */}
            <div className="relative w-40 flex-none overflow-hidden bg-muted">
              <Image
                src={r.thumbnail.url}
                alt={r.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="160px"
              />
              {isFavorited !== undefined && (
                <FavoriteButton recipeId={r._id} initialFavorited={isFavorited} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1">
                    {r.title}
                  </h3>
                  <span className={cn(
                    "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-white/90",
                    getDifficultyColor(r.difficulty)
                  )}>
                    <ChefHat className="h-3 w-3" />
                    {t(`difficulty.${r.difficulty}`)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.description}</p>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(r.estimatedTime)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {r.servings} {t("recipes.servings")}
                </span>
                <span className="ml-auto flex items-center gap-1 min-w-0">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{r.author?.name ?? t("recipes.system")}</span>
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/recipes/${r._id}`} className="group block">
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          {/* Thumbnail */}
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <Image
              src={r.thumbnail.url}
              alt={r.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {isFavorited !== undefined && (
              <FavoriteButton recipeId={r._id} initialFavorited={isFavorited} />
            )}
            <div className="absolute top-3 right-3">
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm bg-white/90",
                getDifficultyColor(r.difficulty)
              )}>
                <ChefHat className="h-3 w-3" />
                {t(`difficulty.${r.difficulty}`)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {r.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {r.description}
            </p>

            {/* Meta */}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(r.estimatedTime)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {r.servings} {t("recipes.servings")}
              </span>
              <span className="ml-auto flex items-center gap-1 min-w-0">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{r.author?.name ?? t("recipes.system")}</span>
              </span>
            </div>

            {/* Categories */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.categories.slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getCategoryColor(cat))}
                >
                  {t(`category.${cat}`)}
                </span>
              ))}
              {r.categories.length > 3 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  +{r.categories.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
