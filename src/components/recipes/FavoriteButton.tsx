"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  recipeId: string;
  initialFavorited: boolean;
}

export function FavoriteButton({ recipeId, initialFavorited }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    const prev = favorited;
    setFavorited(!prev);

    try {
      const res = await fetch(`/api/recipes/${recipeId}/favorite`, { method: "POST" });
      if (!res.ok) {
        setFavorited(prev);
      } else {
        const data = await res.json();
        setFavorited(data.favorited);
      }
    } catch {
      setFavorited(prev);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "absolute top-3 left-3 z-10",
        "flex h-7 w-7 items-center justify-center rounded-full",
        "bg-white/90 backdrop-blur-sm shadow-sm border border-white/20",
        "transition-all duration-200 hover:scale-110 active:scale-95",
        loading && "opacity-60 cursor-not-allowed"
      )}
    >
      <Heart
        className={cn(
          "h-3.5 w-3.5 transition-colors duration-200",
          favorited ? "fill-red-500 text-red-500" : "text-slate-500"
        )}
      />
    </button>
  );
}
