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
import { useTranslation } from "@/components/providers/LanguageProvider";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
type EmailFormData = z.infer<typeof emailSchema>;

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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useTranslation();
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

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
      setServerError(json.error || t("auth.forgot.error"));
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
      setServerError(json.error || t("auth.forgot.error"));
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

          {/* Step 1: enter email */}
          {step === "email" && (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-display font-bold">{t("auth.forgot.title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("auth.forgot.subtitle")}
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
                  <Label htmlFor="email">{t("auth.forgot.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("auth.login.emailPlaceholder")}
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
                  {t("auth.forgot.sendCode")}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("auth.forgot.backToSignIn")}
                </Link>
              </p>
            </>
          )}

          {/* Step 2: enter code + new password */}
          {step === "reset" && (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-display font-bold">{t("auth.forgot.enterCode")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("auth.forgot.codeSentTo")}{" "}
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
                  <Label htmlFor="code">{t("auth.forgot.codeLabel")}</Label>
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
                  <Label htmlFor="password">{t("auth.forgot.newPassword")}</Label>
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
                  <Label htmlFor="confirm">{t("auth.forgot.confirmPassword")}</Label>
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
                  {t("auth.forgot.resetPassword")}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {t("auth.forgot.noCode")}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setServerError(null);
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  {t("auth.forgot.tryAgain")}
                </button>
              </p>
            </>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="py-4 text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h1 className="text-2xl font-display font-bold">{t("auth.forgot.doneTitle")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("auth.forgot.doneDesc")}
              </p>
              <Button className="w-full" onClick={() => router.push("/auth/login")}>
                {t("auth.forgot.signIn")}
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
