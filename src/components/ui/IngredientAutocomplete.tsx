"use client";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface IngredientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions: string[];
  className?: string;
}

export function IngredientAutocomplete({
  value,
  onChange,
  placeholder,
  suggestions,
  className,
}: IngredientAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered =
    value.trim().length >= 1
      ? suggestions
          .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 8)
      : [];

  const showList = open && filtered.length > 0;

  function select(s: string) {
    onChange(s);
    setOpen(false);
    setHighlighted(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter" && highlighted >= 0 && showList) {
      e.preventDefault();
      select(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    setHighlighted(-1);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (filtered.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showList && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-lg p-1 max-h-52 overflow-y-auto">
          {filtered.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(s);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors",
                  i === highlighted
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
