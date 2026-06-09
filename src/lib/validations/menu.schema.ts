import { z } from "zod";

export const generateMenuSchema = z.object({
  name: z.string().min(2, "Menu name is required").max(120),
  type: z.enum(["weekly", "biweekly", "monthly"]),
  startDate: z.string().min(1, "Start date is required"),
  mealsPerDay: z
    .array(z.enum(["breakfast", "lunch", "dinner"]))
    .min(1, "Select at least one meal per day"),
  recipeSource: z.enum(["all", "favorites"]).optional(),
  filters: z
    .object({
      categories: z.array(z.string()).optional(),
      maxTime: z.number().optional(),
      difficulty: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

export type GenerateMenuFormData = z.infer<typeof generateMenuSchema>;
