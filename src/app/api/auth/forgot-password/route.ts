import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email });

    // Always respond with ok to avoid revealing whether an account exists
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const hashedCode = await bcrypt.hash(code, 10);
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await User.updateOne(
      { _id: user._id },
      { resetToken: hashedCode, resetTokenExpiry: expiry }
    );

    await sendPasswordResetEmail(email, code);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/forgot-password error:", err);
    return NextResponse.json(
      { error: "Failed to send reset email. Please try again." },
      { status: 500 }
    );
  }
}
