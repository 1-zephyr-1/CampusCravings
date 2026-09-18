"use client";

import { ArrowUpDown } from "lucide-react";
import { clsx } from "clsx";

export type SortKey = "newest" | "price_asc" | "price_desc" | "rating";

interface SortControlProps {
  value: SortKey;
  onChange: (next: SortKey) => void;
  className?: string;
}

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "rating", label: "Top rated" },
];

/**
 * Native <select> disguised as a pill button.
 * Keyboard & screen-reader friendly without the cost of a custom combobox.
 */
export function SortControl({ value, onChange, className }: SortControlProps) {
  return (
    <label
      className={clsx(
        "relative inline-flex items-center gap-1.5 pl-8 pr-3 py-1.5",
        "rounded-lg border border-[var(--border)] bg-[var(--surface)]",
        "text-xs font-medium text-[var(--text-muted)] hover:border-[var(--primary)]/40 transition-colors",
        className
      )}
    >
      <ArrowUpDown
        size={14}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
      <span className="sr-only">Sort items by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="appearance-none bg-transparent text-[var(--text)] focus:outline-none cursor-pointer pr-1"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
