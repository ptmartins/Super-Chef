export const dynamic = "force-dynamic";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, CalendarDays, ShoppingCart, ChefHat, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectDB } from "@/lib/mongodb";
import Recipe from "@/models/Recipe";
import type { IRecipe } from "@/types";

async function getLatestRecipes(): Promise<IRecipe[]> {
  try {
    await connectDB();
    const recipes = await Recipe.find().sort({ createdAt: -1 }).limit(6).lean();
    return JSON.parse(JSON.stringify(recipes));
  } catch {
    return [];
  }
}

const features = [
  {
    icon: BookOpen,
    title: "Recipe Library",
    description: "Build your personal collection with photos, ingredients, steps, difficulty levels, and categories.",
  },
  {
    icon: CalendarDays,
    title: "Smart Menu Planning",
    description: "Auto-generate weekly, bi-weekly, or monthly menus from your recipes with one click.",
  },
  {
    icon: ShoppingCart,
    title: "Shopping List",
    description: "Get an auto-aggregated ingredient list for your full menu. Check items off as you shop.",
  },
  {
    icon: Sparkles,
    title: "Variety Guaranteed",
    description: "Our algorithm ensures no repetitive meals — diverse, balanced menus every time.",
  },
];

export default async function Home() {
  const latestRecipes = await getLatestRecipes();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-background to-amber-50/30 dark:from-orange-950/40 dark:via-background dark:to-amber-950/20 border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <ChefHat className="h-4 w-4" />
              Your personal meal planning companion
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight text-foreground">
              Cook with
              <span className="text-primary"> passion</span>,
              <br />
              plan with ease.
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-xl">
              Super Chef helps you build your recipe collection, generate smart meal plans,
              and create shopping lists — all in one beautiful place.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="shadow-lg">
                <Link href="/recipes">
                  Browse Recipes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/menus/generate">
                  Generate a Menu
                  <Sparkles className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative blob */}
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-60 w-60 rounded-full bg-amber-400/5 blur-3xl" />
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold">Everything you need to eat well</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              From recipe creation to weekly meal plans, Super Chef has all the tools for a delicious life.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border bg-card p-6 hover:shadow-md transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest recipes */}
      {latestRecipes.length > 0 && (
        <section className="py-16 bg-muted/30 border-t">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-display font-bold">Latest Recipes</h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/recipes">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestRecipes.map((recipe) => (
                <Link key={recipe._id} href={`/recipes/${recipe._id}`} className="group">
                  <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300">
                    <div className="relative aspect-[4/3] bg-muted">
                      <Image
                        src={recipe.thumbnail.url}
                        alt={recipe.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                        {recipe.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold">Start your culinary journey</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-md mx-auto">
            Add your first recipe and let Super Chef handle the rest.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary" className="shadow">
              <Link href="/recipes/new">+ Add Recipe</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/menus">View Menus</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
