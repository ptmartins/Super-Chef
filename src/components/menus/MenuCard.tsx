"use client";
import Link from "next/link";
import { CalendarDays, Utensils, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import type { IMenu } from "@/types";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface MenuCardProps {
  menu: IMenu;
  index?: number;
}

const menuTypeColors = {
  weekly: "bg-violet-100 text-violet-800",
  biweekly: "bg-blue-100 text-blue-800",
  monthly: "bg-emerald-100 text-emerald-800",
};

const menuTypeDays = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

export function MenuCard({ menu, index = 0 }: MenuCardProps) {
  const t = useTranslation();
  const color = menuTypeColors[menu.type];
  const days = menuTypeDays[menu.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/menus/${menu._id}`} className="group block">
        <div className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {menu.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(menu.startDate)} – {formatDate(menu.endDate)}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${color}`}>
              {t(`menus.type.${menu.type}`)}
            </span>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {days} {t("menus.days")}
            </span>
            <span className="flex items-center gap-1.5">
              <Utensils className="h-4 w-4" />
              {menu.days?.reduce((acc, d) => acc + (d.meals?.length ?? 0), 0) ?? 0} {t("menus.meals")}
            </span>
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              {menu.shoppingList?.length ?? 0} {t("menus.items")}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
