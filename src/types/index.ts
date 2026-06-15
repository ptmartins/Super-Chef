export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeStep {
  order: number;
  description: string;
}

export interface RecipeThumbnail {
  url: string;
  publicId: string;
}

export type Difficulty = "easy" | "medium" | "hard";
export type MealType = "breakfast" | "lunch" | "dinner";
export type MenuType = "weekly" | "biweekly" | "monthly";

export const CATEGORIES = [
  "fish",
  "meat",
  "pasta",
  "dessert",
  "soup",
  "salad",
  "italian",
  "chinese",
  "japanese",
  "mexican",
  "indian",
  "american",
  "vegetarian",
  "vegan",
  "gluten-free",
  "breakfast",
  "snack",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tbsp",
  "tsp",
  "cup",
  "oz",
  "lb",
  "piece",
  "slice",
  "clove",
  "pinch",
  "bunch",
  "can",
  "package",
] as const;

export interface RecipeTranslationPt {
  title?: string;
  description?: string;
  ingredients?: Array<{ name: string }>;
  steps?: Array<{ description: string }>;
  tags?: string[];
}

export interface IRecipe {
  _id: string;
  title: string;
  description: string;
  thumbnail: RecipeThumbnail;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  estimatedTime: number;
  difficulty: Difficulty;
  categories: Category[];
  servings: number;
  tags: string[];
  suitableFor: MealType[];
  slug: string;
  author?: { _id: string; name: string } | null;
  source?: string | null;
  translations?: { pt?: RecipeTranslationPt };
  createdAt: string;
  updatedAt: string;
}

export interface MealSlot {
  type: MealType;
  recipeId: string;
  recipeTitle: string;
  recipeThumbnail: string;
  servings: number;
}

export interface MenuDay {
  dayIndex: number;
  date: string;
  meals: MealSlot[];
}

export interface AggregatedIngredient {
  name: string;
  totalAmount: number;
  unit: string;
  checked: boolean;
}

export interface IMenu {
  _id: string;
  name: string;
  type: MenuType;
  startDate: string;
  endDate: string;
  days: MenuDay[];
  shoppingList: AggregatedIngredient[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeFilters {
  search?: string;
  category?: string;
  difficulty?: string;
  maxTime?: number;
  tags?: string;
  suitableFor?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedRecipes {
  recipes: IRecipe[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedMenus {
  menus: IMenu[];
  total: number;
  page: number;
  totalPages: number;
}
