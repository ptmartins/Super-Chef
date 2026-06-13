"use client";
import Image from "next/image";
import Link from "next/link";
import { Clock, Users, ChefHat } from "lucide-react";
import { motion } from "framer-motion";
import type { IRecipe } from "@/types";
import { formatTime, getDifficultyColor, getCategoryColor, cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";

interface RecipeCardProps {
  recipe: IRecipe;
  index?: number;
  isFavorited?: boolean;
}

export function RecipeCard({ recipe, index = 0, isFavorited }: RecipeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/recipes/${recipe._id}`} className="group block">
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          {/* Thumbnail */}
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <Image
              src={recipe.thumbnail.url}
              alt={recipe.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {/* Favorite button — top left (only for authenticated users) */}
            {isFavorited !== undefined && (
              <FavoriteButton recipeId={recipe._id} initialFavorited={isFavorited} />
            )}
            {/* Difficulty badge — top right */}
            <div className="absolute top-3 right-3">
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm bg-white/90",
                getDifficultyColor(recipe.difficulty)
              )}>
                <ChefHat className="h-3 w-3" />
                {recipe.difficulty}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {recipe.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {recipe.description}
            </p>

            {/* Meta */}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(recipe.estimatedTime)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {recipe.servings} servings
              </span>
              <span className="ml-auto truncate">
                {recipe.author?.name ?? "System"}
              </span>
            </div>

            {/* Categories */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recipe.categories.slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getCategoryColor(cat))}
                >
                  {cat}
                </span>
              ))}
              {recipe.categories.length > 3 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  +{recipe.categories.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
