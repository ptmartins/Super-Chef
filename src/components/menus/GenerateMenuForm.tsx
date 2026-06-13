"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Sparkles, BookOpen, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { generateMenuSchema, type GenerateMenuFormData } from "@/lib/validations/menu.schema";
import { CATEGORIES } from "@/types";
import { getCategoryColor, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/components/providers/LanguageProvider";

export function GenerateMenuForm() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const { data: session } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterMaxTime, setFilterMaxTime] = useState(180);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [recipeSource, setRecipeSource] = useState<"all" | "favorites">("all");

  const menuTypes = [
    { value: "weekly" as const, days: 7, description: t("menus.form.weeklyDesc") },
    { value: "biweekly" as const, days: 14, description: t("menus.form.biweeklyDesc") },
    { value: "monthly" as const, days: 30, description: t("menus.form.monthlyDesc") },
  ];

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<GenerateMenuFormData>({
    resolver: zodResolver(generateMenuSchema),
    defaultValues: {
      name: "",
      type: "weekly",
      startDate: new Date().toISOString().split("T")[0],
      mealsPerDay: ["breakfast", "lunch", "dinner"],
    },
  });

  const watchedType = watch("type");

  const onSubmit = async (data: GenerateMenuFormData) => {
    setIsGenerating(true);
    try {
      const payload = {
        ...data,
        recipeSource,
        filters: {
          ...(filterMaxTime < 180 ? { maxTime: filterMaxTime } : {}),
          ...(filterCategories.length > 0 ? { categories: filterCategories } : {}),
        },
      };

      const res = await fetch("/api/menus/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to generate menu");

      toast({ title: t("menus.generated"), description: `${data.name} is ready.` });
      router.push(`/menus/${result.menu._id}`);
      router.refresh();
    } catch (err) {
      toast({
        title: t("menus.generationFailed"),
        description: err instanceof Error ? err.message : t("form.somethingWrong"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">{t("menus.form.name")}</Label>
        <Input id="name" placeholder={t("menus.form.namePlaceholder")} {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label>{t("menus.form.type")}</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-3">
              {menuTypes.map((mt) => (
                <button
                  key={mt.value}
                  type="button"
                  onClick={() => field.onChange(mt.value)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    field.value === mt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted"
                  )}
                >
                  <div className="font-semibold text-sm">{t(`menus.type.${mt.value}`)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{mt.description}</div>
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Start date */}
      <div className="space-y-2">
        <Label htmlFor="startDate">{t("menus.form.startDate")}</Label>
        <Input id="startDate" type="date" {...register("startDate")} />
        {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
      </div>

      {/* Meals per day */}
      <div className="space-y-2">
        <Label>{t("menus.form.mealsPerDay")}</Label>
        <Controller
          control={control}
          name="mealsPerDay"
          render={({ field }) => (
            <div className="flex gap-4">
              {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                <label key={meal} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={field.value.includes(meal)}
                    onCheckedChange={(checked) => {
                      field.onChange(
                        checked ? [...field.value, meal] : field.value.filter((m) => m !== meal)
                      );
                    }}
                  />
                  <span className="text-sm">{t(`meal.${meal}`)}</span>
                </label>
              ))}
            </div>
          )}
        />
        {errors.mealsPerDay && <p className="text-xs text-destructive">{errors.mealsPerDay.message}</p>}
      </div>

      {/* Recipe source */}
      <div className="space-y-2">
        <Label>{t("menus.form.recipeSource")}</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRecipeSource("all")}
            className={cn(
              "rounded-xl border-2 p-4 text-left transition-all flex items-start gap-3",
              recipeSource === "all"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted"
            )}
          >
            <BookOpen className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <div className="font-semibold text-sm">{t("menus.form.allRecipes")}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t("menus.form.allRecipesDesc")}</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => session ? setRecipeSource("favorites") : undefined}
            disabled={!session}
            className={cn(
              "rounded-xl border-2 p-4 text-left transition-all flex items-start gap-3",
              !session && "opacity-50 cursor-not-allowed",
              recipeSource === "favorites" && session
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted"
            )}
          >
            <Heart className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
            <div>
              <div className="font-semibold text-sm">{t("menus.form.myFavorites")}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {session ? t("menus.form.favoritesDesc") : t("menus.form.signInToUse")}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Optional filters */}
      <div className="rounded-2xl border bg-muted/30 p-5 space-y-5">
        <p className="text-sm font-semibold">{t("menus.form.optionalFilters")}</p>

        {/* Max time */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("menus.form.maxTime")} {filterMaxTime >= 180 ? t("menus.form.maxTimeAny") : `${filterMaxTime} ${t("recipes.min")}`}
          </p>
          <Slider
            min={15}
            max={180}
            step={15}
            value={[filterMaxTime]}
            onValueChange={([v]) => setFilterMaxTime(v)}
          />
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("menus.form.categories")}</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const selected = filterCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setFilterCategories((prev) =>
                      selected ? prev.filter((c) => c !== cat) : [...prev, cat]
                    )
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                    selected
                      ? cn(getCategoryColor(cat), "border-current ring-1 ring-current/20")
                      : "border-border hover:border-primary/30 bg-background hover:bg-muted"
                  )}
                >
                  {t(`category.${cat}`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Button type="submit" size="lg" disabled={isGenerating} className="w-full">
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t("menus.form.generating")}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            {t("menus.form.generateBtn")}
          </>
        )}
      </Button>
    </form>
  );
}
