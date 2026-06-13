"use client";
import { useState } from "react";
import { Check, ShoppingCart, Download } from "lucide-react";
import type { AggregatedIngredient } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface ShoppingListProps {
  items: AggregatedIngredient[];
  menuId: string;
  menuName: string;
}

export function ShoppingList({ items: initialItems, menuId, menuName }: ShoppingListProps) {
  const { toast } = useToast();
  const t = useTranslation();
  const [items, setItems] = useState(initialItems);
  const [saving, setSaving] = useState<number | null>(null);

  const toggleItem = async (index: number) => {
    const newChecked = !items[index].checked;
    const updated = items.map((item, i) => i === index ? { ...item, checked: newChecked } : item);
    setItems(updated);
    setSaving(index);

    try {
      await fetch(`/api/menus/${menuId}/shopping-list`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIndex: index, checked: newChecked }),
      });
    } catch {
      setItems(items);
      toast({ title: t("menus.failedToSave"), variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const progress = items.length > 0 ? (checkedCount / items.length) * 100 : 0;

  const exportList = () => {
    const text = [
      `Shopping List — ${menuName}`,
      "=".repeat(40),
      ...items.map((i) => `${i.checked ? "[x]" : "[ ]"} ${i.totalAmount} ${i.unit} ${i.name}`),
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${menuName.replace(/\s+/g, "-").toLowerCase()}-shopping-list.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = items.reduce<Record<string, (AggregatedIngredient & { index: number })[]>>(
    (acc, item, index) => {
      const key = item.name[0].toUpperCase();
      acc[key] = acc[key] ?? [];
      acc[key].push({ ...item, index });
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <span className="font-semibold">{items.length} {t("menus.ingredients")}</span>
          <span className="text-sm text-muted-foreground">({checkedCount} {t("menus.checked")})</span>
        </div>
        <Button variant="outline" size="sm" onClick={exportList}>
          <Download className="h-3.5 w-3.5 mr-1" />
          {t("menus.export")}
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Grouped list */}
      <div className="space-y-4">
        {Object.keys(grouped).sort().map((letter) => (
          <div key={letter}>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{letter}</h4>
            <div className="space-y-1">
              {grouped[letter].map(({ index, ...item }) => (
                <button
                  key={index}
                  onClick={() => toggleItem(index)}
                  disabled={saving === index}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                    item.checked
                      ? "bg-muted/60 border-transparent opacity-60"
                      : "bg-background border-border hover:border-primary/30 hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    item.checked ? "bg-primary border-primary" : "border-muted-foreground"
                  )}>
                    {item.checked && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className={cn("flex-1 text-sm font-medium capitalize", item.checked && "line-through")}>
                    {item.name}
                  </span>
                  <span className={cn("text-sm tabular-nums", item.checked ? "text-muted-foreground" : "text-foreground font-semibold")}>
                    {item.totalAmount} {item.unit}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
