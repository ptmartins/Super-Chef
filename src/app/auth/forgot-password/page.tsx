"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChefHat, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Step 1: request code ──────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
type EmailFormData = z.infer<typeof emailSchema>;

// ── Step 2: verify code + new password ───────────────────────────────────────

const resetSchema = z
  .object({
    code: z
      .string()
      .length(6, "Code must be 6 digits")
      .regex(/^\d{6}$/, "Code must be 6 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
type ResetFormData = z.infer<typeof resetSchema>;

// ─────────────────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  // Step 1 form
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  // Step 2 form
  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  async function onRequestCode(data: EmailFormData) {
    setServerError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error || "Something went wrong. Please try again.");
      return;
    }
    setEmail(data.email);
    setStep("reset");
  }

  async function onResetPassword(data: ResetFormData) {
    setServerError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: data.code, password: data.password }),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error || "Something went wrong. Please try again.");
      return;
    }
    setStep("done");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <ChefHat className="h-7 w-7" />
          </div>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm p-8">

          {/* ── Step 1: enter email ── */}
          {step === "email" && (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-display font-bold">Forgot password?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send you a 6-digit reset code.
                </p>
              </div>

              <form
                onSubmit={emailForm.handleSubmit(onRequestCode)}
                noValidate
                className="space-y-4"
              >
                {serverError && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    {serverError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...emailForm.register("email")}
                    aria-invalid={!!emailForm.formState.errors.email}
                    className={emailForm.formState.errors.email ? "border-destructive" : ""}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={emailForm.formState.isSubmitting}
                >
                  {emailForm.formState.isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Send reset code
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </p>
            </>
          )}

          {/* ── Step 2: enter code + new password ── */}
          {step === "reset" && (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-display font-bold">Enter reset code</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                </p>
              </div>

              <form
                onSubmit={resetForm.handleSubmit(onResetPassword)}
                noValidate
                className="space-y-4"
              >
                {serverError && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    {serverError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="code">6-digit code</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    {...resetForm.register("code")}
                    aria-invalid={!!resetForm.formState.errors.code}
                    className={`tracking-[0.4em] text-center text-lg font-mono ${
                      resetForm.formState.errors.code ? "border-destructive" : ""
                    }`}
                  />
                  {resetForm.formState.errors.code && (
                    <p className="text-xs text-destructive">
                      {resetForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...resetForm.register("password")}
                    aria-invalid={!!resetForm.formState.errors.password}
                    className={resetForm.formState.errors.password ? "border-destructive" : ""}
                  />
                  {resetForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {resetForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...resetForm.register("confirm")}
                    aria-invalid={!!resetForm.formState.errors.confirm}
                    className={resetForm.formState.errors.confirm ? "border-destructive" : ""}
                  />
                  {resetForm.formState.errors.confirm && (
                    <p className="text-xs text-destructive">
                      {resetForm.formState.errors.confirm.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetForm.formState.isSubmitting}
                >
                  {resetForm.formState.isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Reset password
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Didn&apos;t receive a code?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setServerError(null);
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  Try again
                </button>
              </p>
            </>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="py-4 text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h1 className="text-2xl font-display font-bold">Password updated!</h1>
              <p className="text-sm text-muted-foreground">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Button className="w-full" onClick={() => router.push("/auth/login")}>
                Sign in
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
