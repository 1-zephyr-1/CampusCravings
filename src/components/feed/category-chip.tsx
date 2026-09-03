"use client";

import { clsx } from "clsx";

interface CategoryChipProps {
  name: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}

export function CategoryChip({ name, icon, isActive, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
        isActive
          ? "bg-tomato text-white shadow-sm"
          : "bg-surface border border-sand text-espresso hover:border-tomato/30 dark:bg-surface-dark dark:border-[#4A3D30] dark:text-cream"
      )}
    >
      <span className="text-sm">{icon}</span>
      {name}
    </button>
  );
}
