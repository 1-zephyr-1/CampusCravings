"use client";

import { clsx } from "clsx";

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  /** Multi-select (aria-pressed) vs single-select (aria-checked). Default multi. */
  mode?: "multi" | "single";
  className?: string;
}

/**
 * Multi/single-select chip used for dietary filters.
 * Roving focus is handled by the parent (we just announce via aria-pressed).
 */
export function FilterChip({
  label,
  isActive,
  onClick,
  mode = "multi",
  className,
}: FilterChipProps) {
  const roleProps =
    mode === "multi"
      ? { "aria-pressed": isActive }
      : { role: "radio" as const, "aria-checked": isActive };

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 border",
        isActive
          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
          : "bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:border-[var(--primary)]/40",
        className
      )}
      {...roleProps}
    >
      {label}
    </button>
  );
}
