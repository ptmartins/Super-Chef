"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, BookOpen, CalendarDays, ShoppingBasket, Menu, X, LogIn, LogOut, UserPlus, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useTranslation } from "@/components/providers/LanguageProvider";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslation();

  const links = [
    { href: "/recipes", label: t("nav.recipes"), icon: BookOpen },
    { href: "/menus", label: t("nav.menus"), icon: CalendarDays },
    ...(isLoggedIn ? [{ href: "/pantry", label: t("nav.pantry"), icon: ShoppingBasket }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setOpen(false)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              Super Chef
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            {isLoggedIn ? (
              <>
                <Link
                  href="/recipes/new"
                  className="ml-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {t("nav.newRecipe")}
                </Link>
                <div className="ml-2 flex items-center gap-2 pl-2 border-l border-border">
                  <span className="text-sm text-muted-foreground max-w-[120px] truncate">
                    {session.user?.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("nav.signOut")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="ml-2 flex items-center gap-1">
                <Link
                  href="/auth/login"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  {t("nav.signIn")}
                </Link>
                <Link
                  href="/auth/register"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("nav.register")}
                </Link>
              </div>
            )}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <LanguageToggle />

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center h-9 w-9 rounded-xl border border-border hover:bg-muted transition-colors"
              aria-label={t("nav.toggleTheme")}
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-border hover:bg-muted transition-colors"
              aria-label={t("nav.toggleMenu")}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/40 bg-background"
          >
            <nav className="flex flex-col gap-1 p-4">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}

              {isLoggedIn ? (
                <>
                  <Link
                    href="/recipes/new"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-1"
                  >
                    {t("nav.newRecipe")}
                  </Link>
                  <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between px-2">
                    <span className="text-sm text-muted-foreground truncate max-w-[160px]">
                      {session.user?.name}
                    </span>
                    <button
                      onClick={() => {
                        setOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.signOut")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-2 pt-2 border-t border-border/40 flex flex-col gap-1">
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    {t("nav.signIn")}
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    {t("nav.register")}
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
