import mongoose, { Schema, Model, Document } from "mongoose";

interface MenuDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: "weekly" | "biweekly" | "monthly";
  startDate: Date;
  endDate: Date;
  days: Array<{
    dayIndex: number;
    date: Date;
    meals: Array<{
      type: "breakfast" | "lunch" | "dinner";
      recipeId: mongoose.Types.ObjectId;
      recipeTitle: string;
      recipeThumbnail: string;
      servings: number;
    }>;
  }>;
  shoppingList: Array<{
    name: string;
    totalAmount: number;
    unit: string;
    checked: boolean;
  }>;
}

const MealSlotSchema = new Schema(
  {
    type: { type: String, enum: ["breakfast", "lunch", "dinner"], required: true },
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
    recipeTitle: { type: String, required: true },
    recipeThumbnail: { type: String, required: true },
    servings: { type: Number, required: true },
  },
  { _id: false }
);

const DaySchema = new Schema(
  {
    dayIndex: { type: Number, required: true },
    date: { type: Date, required: true },
    meals: { type: [MealSlotSchema], required: true },
  },
  { _id: false }
);

const AggregatedIngredientSchema = new Schema(
  {
    name: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    unit: { type: String, required: true },
    checked: { type: Boolean, default: false },
  },
  { _id: false }
);

const MenuSchema = new Schema<MenuDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, required: true, enum: ["weekly", "biweekly", "monthly"] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: [DaySchema], required: true },
    shoppingList: { type: [AggregatedIngredientSchema], default: [] },
  },
  { timestamps: true }
);

MenuSchema.index({ createdAt: -1 });
MenuSchema.index({ startDate: 1, endDate: 1 });

const Menu: Model<MenuDocument> =
  mongoose.models.Menu ??
  mongoose.model<MenuDocument>("Menu", MenuSchema);

export default Menu;
