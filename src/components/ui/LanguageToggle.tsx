"use client";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { locale, setLocale, isPending } = useLanguage();

  return (
    <div
      className={cn(
        "flex items-center rounded-xl border border-border overflow-hidden text-xs font-semibold transition-opacity",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      <button
        onClick={() => setLocale("en")}
        disabled={isPending}
        className={cn(
          "px-2.5 py-1.5 transition-colors",
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("pt")}
        disabled={isPending}
        className={cn(
          "px-2.5 py-1.5 transition-colors",
          locale === "pt"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        PT
      </button>
    </div>
  );
}
