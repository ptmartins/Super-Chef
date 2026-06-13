import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { cookies } from "next/headers";
import { getT, type Locale } from "@/lib/i18n";
import { GenerateMenuForm } from "@/components/menus/GenerateMenuForm";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Generate Menu" };

export default async function GenerateMenuPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value ?? "en") as Locale;
  const t = getT(locale);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/menus">
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("menus.backToMenus")}
        </Link>
      </Button>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-display font-bold">{t("menus.generate")}</h1>
        </div>
        <p className="text-muted-foreground">
          {t("menus.generateDesc")}
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <GenerateMenuForm />
      </div>
    </div>
  );
}
