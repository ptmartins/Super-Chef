export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, CalendarDays } from "lucide-react";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Menu from "@/models/Menu";
import type { IMenu } from "@/types";
import { getT, type Locale } from "@/lib/i18n";
import { MenuCard } from "@/components/menus/MenuCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Menus" };

export default async function MenusPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value ?? "en") as Locale;
  const t = getT(locale);

  await connectDB();
  const raw = await Menu.find({ userId: session.user.id }, { days: 0 }).sort({ createdAt: -1 }).limit(20).lean();
  const menus: IMenu[] = JSON.parse(JSON.stringify(raw));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{t("menus.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("menus.subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/menus/generate">
            <Sparkles className="h-4 w-4 mr-1" />
            {t("menus.generate")}
          </Link>
        </Button>
      </div>

      {menus.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title={t("menus.noMenus")}
          description={t("menus.noMenusDesc")}
          action={
            <Button asChild>
              <Link href="/menus/generate">
                <Sparkles className="h-4 w-4 mr-1" />
                {t("menus.generate")}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map((menu, i) => (
            <MenuCard key={menu._id} menu={menu} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
