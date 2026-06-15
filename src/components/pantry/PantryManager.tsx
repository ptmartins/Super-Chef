"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, X, ChefHat, Clock, Loader2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IngredientAutocomplete } from "@/components/ui/IngredientAutocomplete";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { commonIngredients } from "@/lib/commonIngredients";
import { cn, formatTime } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

interface RecipeSuggestion {
  _id: string;
  title: string;
  thumbnail: { url: string };
  matchedCount: number;
  totalCount: number;
  score: number;
  missingIngredients: string[];
  estimatedTime: number;
  difficulty: string;
}

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-600",
  medium: "text-amber-600",
  hard: "text-rose-600",
};

export function PantryManager() {
  const { t, locale } = useLanguage();
  const [pantry, setPantry] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [pantryLoading, setPantryLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/pantry")
      .then((r) => r.json())
      .then((data) => {
        setPantry(data.pantry ?? []);
        setPantryLoading(false);
      })
      .catch(() => setPantryLoading(false));
  }, []);

  // Debounce suggestion refetch on pantry change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (pantry.length === 0) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSuggestionsLoading(true);
      fetch("/api/pantry/suggestions")
        .then((r) => r.json())
        .then((data) => {
          setSuggestions(data.suggestions ?? []);
          setSuggestionsLoading(false);
        })
        .catch(() => setSuggestionsLoading(false));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pantry]);

  async function addItem() {
    const trimmed = input.trim();
    if (!trimmed || pantry.map((p) => p.toLowerCase()).includes(trimmed.toLowerCase())) {
      setInput("");
      return;
    }
    setAdding(true);
    await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: trimmed }),
    });
    setPantry((p) => [...p, trimmed]);
    setInput("");
    setAdding(false);
  }

  async function removeItem(item: string) {
    await fetch("/api/pantry", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item }),
    });
    setPantry((p) => p.filter((i) => i !== item));
  }

  const ingredientSuggestions = commonIngredients[locale as Locale] ?? commonIngredients.en;

  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold">{t("pantry.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("pantry.subtitle")}</p>
      </div>

      {/* Add ingredient */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex gap-2">
          <IngredientAutocomplete
            value={input}
            onChange={setInput}
            placeholder={t("pantry.addPlaceholder")}
            suggestions={ingredientSuggestions}
            className="flex-1"
          />
          <Button
            onClick={addItem}
            disabled={!input.trim() || adding}
            className="shrink-0"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            {t("pantry.add")}
          </Button>
        </div>

        {/* Pantry items */}
        {pantryLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("pantry.loadingPantry")}
          </div>
        ) : pantry.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">{t("pantry.empty")}</p>
            <p className="text-xs mt-0.5">{t("pantry.emptyDesc")}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pantry.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                {item}
                <button
                  onClick={() => removeItem(item)}
                  aria-label={`${t("pantry.remove")} ${item}`}
                  className="rounded-full hover:bg-primary/20 transition-colors p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {(pantry.length > 0 || suggestionsLoading) && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              {t("pantry.suggestions")}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("pantry.suggestionsDesc")}
            </p>
          </div>

          {suggestionsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("pantry.loadingSuggestions")}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
              <p className="font-medium">{t("pantry.noSuggestions")}</p>
              <p className="text-sm mt-1">{t("pantry.noSuggestionsDesc")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestions.map((s) => {
                const pct = Math.round(s.score * 100);
                return (
                  <div
                    key={s._id}
                    className="rounded-2xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[16/9] bg-muted">
                      <Image
                        src={s.thumbnail.url}
                        alt={s.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      {/* Match badge */}
                      <div
                        className={cn(
                          "absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow",
                          pct === 100
                            ? "bg-emerald-500"
                            : pct >= 70
                            ? "bg-green-500"
                            : pct >= 40
                            ? "bg-amber-500"
                            : "bg-orange-500"
                        )}
                      >
                        {pct}% {t("pantry.match")}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <h3 className="font-semibold leading-snug line-clamp-2">
                        {s.title}
                      </h3>

                      {/* Match bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {s.matchedCount}/{s.totalCount} ingredients
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(s.estimatedTime)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct === 100
                                ? "bg-emerald-500"
                                : pct >= 70
                                ? "bg-green-500"
                                : pct >= 40
                                ? "bg-amber-500"
                                : "bg-orange-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Missing ingredients */}
                      {s.missingIngredients.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{t("pantry.missing")}</span>{" "}
                          {s.missingIngredients.join(", ")}
                          {s.totalCount - s.matchedCount > s.missingIngredients.length
                            ? ` +${s.totalCount - s.matchedCount - s.missingIngredients.length} more`
                            : ""}
                        </p>
                      )}

                      <Button asChild size="sm" className="w-full">
                        <Link href={`/recipes/${s._id}`}>
                          {t("pantry.viewRecipe")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
