import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "easy":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "medium":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "hard":
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    fish: "bg-blue-100 text-blue-800",
    meat: "bg-red-100 text-red-800",
    pasta: "bg-yellow-100 text-yellow-800",
    dessert: "bg-pink-100 text-pink-800",
    soup: "bg-orange-100 text-orange-800",
    salad: "bg-green-100 text-green-800",
    italian: "bg-green-100 text-green-800",
    chinese: "bg-red-100 text-red-800",
    japanese: "bg-rose-100 text-rose-800",
    mexican: "bg-orange-100 text-orange-800",
    indian: "bg-amber-100 text-amber-800",
    american: "bg-blue-100 text-blue-800",
    vegetarian: "bg-emerald-100 text-emerald-800",
    vegan: "bg-teal-100 text-teal-800",
    "gluten-free": "bg-lime-100 text-lime-800",
    breakfast: "bg-purple-100 text-purple-800",
    snack: "bg-indigo-100 text-indigo-800",
  };
  return colors[category] ?? "bg-gray-100 text-gray-800";
}

export function getMenuDays(type: string): number {
  switch (type) {
    case "weekly":
      return 7;
    case "biweekly":
      return 14;
    case "monthly":
      return 30;
    default:
      return 7;
  }
}
