import type { IRecipe } from "@/types";
import { en } from "@/i18n/en";
import { pt } from "@/i18n/pt";

export type Locale = "en" | "pt";

export function getDict(locale: Locale): Record<string, string> {
  return locale === "pt" ? pt : en;
}

export function getT(locale: Locale): (key: string) => string {
  const dict = getDict(locale);
  return (key: string) => dict[key] ?? key;
}

export function localizeRecipe(recipe: IRecipe, locale: Locale): IRecipe {
  if (locale === "en" || !recipe.translations?.pt) return recipe;
  const p = recipe.translations.pt;
  return {
    ...recipe,
    title: p.title ?? recipe.title,
    description: p.description ?? recipe.description,
    ingredients: recipe.ingredients.map((ing, i) => ({
      ...ing,
      name: p.ingredients?.[i]?.name ?? ing.name,
    })),
    steps: recipe.steps.map((step, i) => ({
      ...step,
      description: p.steps?.[i]?.description ?? step.description,
    })),
    tags: p.tags ?? recipe.tags,
  };
}
