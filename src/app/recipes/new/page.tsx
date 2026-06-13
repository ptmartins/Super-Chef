import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getT, type Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "New Recipe" };

export default async function NewRecipePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value ?? "en") as Locale;
  const t = getT(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/recipes">
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("recipes.backToRecipes")}
        </Link>
      </Button>
      <h1 className="text-3xl font-display font-bold mb-8">{t("recipe.newTitle")}</h1>
      <RecipeForm />
    </div>
  );
}
