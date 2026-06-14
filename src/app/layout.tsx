import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Heart } from "lucide-react";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { getT, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: {
    default: "Super Chef — Recipe & Menu Planner",
    template: "%s | Super Chef",
  },
  description:
    "Discover, save and plan your meals with Super Chef. Create weekly, bi-weekly and monthly menus from your personal recipe collection.",
  keywords: ["recipes", "meal planning", "menu planner", "cooking", "food"],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value ?? "en") as Locale;
  const t = getT(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <SessionProvider>
            <LanguageProvider initialLocale={locale}>
              <Navbar />
              <main className="flex-1">{children}</main>
              <footer className="border-t py-6 mt-auto">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-1 flex-wrap">
                    © {new Date().getFullYear()} Super Chef. Crafted with
                    <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 shrink-0" />
                    by{" "}
                    <a
                      href="https://pedromartins.com.pt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:text-primary underline underline-offset-2 transition-colors"
                    >
                      Pedro Martins
                    </a>
                    , for food lovers.
                  </p>
                </div>
              </footer>
              <Toaster />
            </LanguageProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
