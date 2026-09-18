"use client";

import { clsx } from "clsx";

interface CategoryChipProps {
  name: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  /** Optional item count for screen readers + sighted users. */
  count?: number;
}

export function CategoryChip({
  name,
  icon,
  isActive,
  onClick,
  count,
}: CategoryChipProps) {
  const label = count != null ? `${name}, ${count} items` : name;
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={label}
      className={clsx(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 border",
        "motion-reduce:transition-none",
        isActive
          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
          : "bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:border-[var(--primary)]/40"
      )}
    >
      <span className="text-sm" aria-hidden="true">
        {icon}
      </span>
      {name}
    </button>
  );
}
