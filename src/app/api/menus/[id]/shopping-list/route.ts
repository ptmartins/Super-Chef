import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Menu from "@/models/Menu";

async function getOwnedMenu(id: string, userId: string) {
  const menu = await Menu.findById(id);
  if (!menu) return { menu: null, error: "Menu not found", status: 404 };
  if (menu.userId.toString() !== userId) return { menu: null, error: "Forbidden", status: 403 };
  return { menu, error: null, status: 200 };
}

// GET /api/menus/[id]/shopping-list
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const { menu, error, status } = await getOwnedMenu(id, session.user.id);
  if (!menu) return NextResponse.json({ error }, { status });

  return NextResponse.json({
    items: menu.shoppingList,
    menuName: menu.name,
    generatedAt: (menu as unknown as { createdAt: Date }).createdAt,
  });
}

// PATCH /api/menus/[id]/shopping-list — toggle checked state
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const { menu, error, status } = await getOwnedMenu(id, session.user.id);
  if (!menu) return NextResponse.json({ error }, { status });

  const { itemIndex, checked } = await req.json();

  if (itemIndex === undefined || typeof checked !== "boolean") {
    return NextResponse.json({ error: "itemIndex and checked are required" }, { status: 400 });
  }

  if (itemIndex < 0 || itemIndex >= menu.shoppingList.length) {
    return NextResponse.json({ error: "Item index out of bounds" }, { status: 400 });
  }

  menu.shoppingList[itemIndex].checked = checked;
  await menu.save();

  return NextResponse.json({ item: menu.shoppingList[itemIndex] });
}
