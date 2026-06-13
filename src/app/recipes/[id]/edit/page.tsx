import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import Recipe from "@/models/Recipe";
import type { IRecipe } from "@/types";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getT, type Locale } from "@/lib/i18n";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    await connectDB();
    const recipe = await Recipe.findById(id).lean() as IRecipe | null;
    return { title: recipe ? `Edit: ${recipe.title}` : "Edit Recipe" };
  } catch {
    return { title: "Edit Recipe" };
  }
}

export default async function EditRecipePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value ?? "en") as Locale;
  const t = getT(locale);

  const { id } = await params;
  await connectDB();
  const raw = await Recipe.findById(id).lean();
  if (!raw) notFound();
  const recipe: IRecipe = JSON.parse(JSON.stringify(raw));

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href={`/recipes/${id}`}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("recipe.backToRecipe")}
        </Link>
      </Button>
      <h1 className="text-3xl font-display font-bold mb-8">{t("recipe.edit")}</h1>
      <RecipeForm recipe={recipe} />
    </div>
  );
}
