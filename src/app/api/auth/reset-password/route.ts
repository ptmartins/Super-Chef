import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      email?: string;
      code?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const code = body.code?.trim();
    const password = body.password;

    if (!email || !code || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email });

    if (!user?.resetToken || !user?.resetTokenExpiry) {
      return NextResponse.json(
        { error: "Invalid or expired reset code" },
        { status: 400 }
      );
    }

    if (new Date() > user.resetTokenExpiry) {
      return NextResponse.json(
        { error: "Reset code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(code, user.resetToken);
    if (!valid) {
      return NextResponse.json({ error: "Invalid reset code" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.updateOne(
      { _id: user._id },
      {
        password: hashedPassword,
        $unset: { resetToken: "", resetTokenExpiry: "" },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/reset-password error:", err);
    return NextResponse.json(
      { error: "Password reset failed. Please try again." },
      { status: 500 }
    );
  }
}
