import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// GET /api/pantry
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findById(session.user.id).select("pantry").lean() as any;
  return NextResponse.json({ pantry: user?.pantry ?? [] });
}

// POST /api/pantry — add one item
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item } = await req.json();
  const trimmed = typeof item === "string" ? item.trim() : "";
  if (!trimmed) return NextResponse.json({ error: "Item is required" }, { status: 400 });

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { $addToSet: { pantry: trimmed } });
  return NextResponse.json({ ok: true });
}

// DELETE /api/pantry — remove one item
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item } = await req.json();
  if (!item) return NextResponse.json({ error: "Item is required" }, { status: 400 });

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { $pull: { pantry: item } });
  return NextResponse.json({ ok: true });
}
