import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Users, ChefHat, Edit3, ChevronLeft } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import Recipe from "@/models/Recipe";
import type { IRecipe } from "@/types";
import { formatTime, getDifficultyColor, getCategoryColor, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeleteRecipeButton } from "./DeleteRecipeButton";
import { auth } from "@/lib/auth";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    await connectDB();
    const recipe = await Recipe.findById(id).lean() as IRecipe | null;
    if (!recipe) return { title: "Recipe not found" };
    return { title: recipe.title, description: recipe.description };
  } catch {
    return { title: "Recipe" };
  }
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const isLoggedIn = !!session?.user;

  await connectDB();
  const raw = await Recipe.findById(id).populate("author", "name").lean();
  if (!raw) notFound();
  const recipe: IRecipe = JSON.parse(JSON.stringify(raw));

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/recipes">
          <ChevronLeft className="h-4 w-4 mr-1" />
          All recipes
        </Link>
      </Button>

      <div className="space-y-8">
        {/* Hero image */}
        <div className="relative aspect-[16/7] rounded-2xl overflow-hidden bg-muted">
          <Image
            src={recipe.thumbnail.url}
            alt={recipe.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 896px"
          />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {recipe.categories.map((cat) => (
                <span key={cat} className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", getCategoryColor(cat))}>
                  {cat}
                </span>
              ))}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">{recipe.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              By {recipe.author?.name ?? "System"}
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">{recipe.description}</p>
          </div>

          {/* Actions — only visible when logged in */}
          {isLoggedIn && (
            <div className="flex gap-2 shrink-0">
              <Button asChild variant="outline" size="sm">
                <Link href={`/recipes/${id}/edit`}>
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </Link>
              </Button>
              <DeleteRecipeButton recipeId={id} />
            </div>
          )}
        </div>

        {/* Meta stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-card p-4 text-center">
            <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="font-semibold">{formatTime(recipe.estimatedTime)}</p>
            <p className="text-xs text-muted-foreground">Total time</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="font-semibold">{recipe.servings}</p>
            <p className="text-xs text-muted-foreground">Servings</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-center">
            <ChefHat className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className={cn("font-semibold capitalize", getDifficultyColor(recipe.difficulty).split(" ")[0])}>
              {recipe.difficulty}
            </p>
            <p className="text-xs text-muted-foreground">Difficulty</p>
          </div>
        </div>

        {/* Suitable for */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Suitable for</p>
          <div className="flex gap-2">
            {recipe.suitableFor.map((meal) => (
              <span key={meal} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                {meal}
              </span>
            ))}
          </div>
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-display font-semibold mb-4">Ingredients</h2>
            <div className="rounded-2xl border bg-card p-4 space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="flex-1 text-sm capitalize">{ing.name}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {ing.amount} {ing.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="md:col-span-3">
            <h2 className="text-xl font-display font-semibold mb-4">Preparation</h2>
            <div className="space-y-4">
              {recipe.steps
                .sort((a, b) => a.order - b.order)
                .map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {step.order}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
