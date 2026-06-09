import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Recipe from "@/models/Recipe";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: recipeId } = await params;

  if (!mongoose.isValidObjectId(recipeId)) {
    return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
  }

  await connectDB();

  const [recipe, user] = await Promise.all([
    Recipe.findById(recipeId).lean(),
    User.findById(session.user.id).select("favorites"),
  ]);

  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alreadyFavorited = (user.favorites as any[])?.some(
    (fid) => fid.toString() === recipeId
  );

  const objectId = new mongoose.Types.ObjectId(recipeId);

  if (alreadyFavorited) {
    await User.updateOne({ _id: user._id }, { $pull: { favorites: objectId } });
  } else {
    await User.updateOne({ _id: user._id }, { $addToSet: { favorites: objectId } });
  }

  return NextResponse.json({ favorited: !alreadyFavorited });
}
