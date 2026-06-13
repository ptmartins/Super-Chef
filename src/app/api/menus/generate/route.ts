import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Menu from "@/models/Menu";
import User from "@/models/User";
import { generateMenuDays } from "@/lib/generateMenu";
import { generateMenuSchema } from "@/lib/validations/menu.schema";
import { getMenuDays } from "@/lib/utils";

// POST /api/menus/generate
export async function POST(req: NextRequest) {
  await connectDB();

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to generate a menu" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await req.json();
    const parsed = generateMenuSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    const { name, type, startDate: startDateStr, mealsPerDay, filters, recipeSource } = parsed.data;

    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
    }

    // Resolve favorite IDs when source is "favorites"
    let favoriteIds: string[] | undefined;
    if (recipeSource === "favorites") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await User.findById(userId).select("favorites").lean() as any;
      const ids: string[] = (user?.favorites ?? []).map((id: any) => id.toString());
      if (ids.length === 0) {
        return NextResponse.json(
          { error: "You have no favorite recipes yet. Heart some recipes first." },
          { status: 400 }
        );
      }
      favoriteIds = ids;
    }

    const numDays = getMenuDays(type);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + numDays - 1);

    const { days, shoppingList } = await generateMenuDays({
      type,
      startDate,
      mealsPerDay,
      filters,
      favoriteIds,
    });

    const menu = await Menu.create({
      userId,
      name,
      type,
      startDate,
      endDate,
      days,
      shoppingList,
    });

    return NextResponse.json({ menu }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate menu";
    console.error("POST /api/menus/generate error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
