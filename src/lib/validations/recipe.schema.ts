import { z } from "zod";
import { CATEGORIES } from "@/types";

export const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required").max(100),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  unit: z.string().min(1, "Unit is required").max(20),
});

export const stepSchema = z.object({
  order: z.number().int().min(1),
  description: z.string().min(1, "Step description is required").max(2000),
});

export const recipeSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(120),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient is required"),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
  estimatedTime: z.number().int().min(1, "Estimated time must be at least 1 minute").max(1440),
  difficulty: z.enum(["easy", "medium", "hard"]),
  categories: z
    .array(z.enum(CATEGORIES))
    .min(1, "Select at least one category"),
  servings: z.number().int().min(1, "Servings must be at least 1").max(100),
  tags: z.array(z.string().max(30)).default([]),
  suitableFor: z
    .array(z.enum(["breakfast", "lunch", "dinner"]))
    .min(1, "Select at least one meal type"),
  source: z.string().max(200).optional(),
});

export type RecipeFormData = z.infer<typeof recipeSchema>;
