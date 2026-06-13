import mongoose, { Schema, Model, Document } from "mongoose";
import type { IRecipe } from "@/types";

type RecipeDocument = Omit<IRecipe, "_id"> & Document;

const IngredientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const StepSchema = new Schema(
  {
    order: { type: Number, required: true },
    description: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const RecipeSchema = new Schema<RecipeDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    thumbnail: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    ingredients: {
      type: [IngredientSchema],
      required: true,
      validate: {
        validator: (a: unknown[]) => a.length > 0,
        message: "At least one ingredient is required",
      },
    },
    steps: {
      type: [StepSchema],
      required: true,
      validate: {
        validator: (a: unknown[]) => a.length > 0,
        message: "At least one step is required",
      },
    },
    estimatedTime: { type: Number, required: true, min: 1 },
    difficulty: { type: String, required: true, enum: ["easy", "medium", "hard"] },
    categories: {
      type: [String],
      required: true,
      enum: [
        "fish", "meat", "pasta", "dessert", "soup", "salad",
        "italian", "chinese", "japanese", "mexican", "indian",
        "american", "vegetarian", "vegan", "breakfast", "snack",
      ],
      validate: {
        validator: (a: string[]) => a.length > 0,
        message: "At least one category is required",
      },
    },
    servings: { type: Number, required: true, min: 1, max: 100 },
    tags: { type: [String], default: [] },
    suitableFor: {
      type: [String],
      enum: ["breakfast", "lunch", "dinner"],
      required: true,
      validate: {
        validator: (a: string[]) => a.length > 0,
        message: "At least one meal type is required",
      },
    },
    slug: { type: String, required: true, unique: true },
    author: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

RecipeSchema.index({ title: "text", description: "text", tags: "text" });
RecipeSchema.index({ categories: 1 });
RecipeSchema.index({ difficulty: 1 });
RecipeSchema.index({ estimatedTime: 1 });
RecipeSchema.index({ suitableFor: 1 });

const Recipe: Model<RecipeDocument> =
  mongoose.models.Recipe ??
  mongoose.model<RecipeDocument>("Recipe", RecipeSchema);

export default Recipe;
