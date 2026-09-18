import { clsx } from "clsx";
import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  variant?: "default" | "accent-line";
  rightSlot?: ReactNode;
  className?: string;
  id?: string;
}

/**
 * Reusable section heading.
 * - variant="accent-line" adds the left red bar used throughout the app.
 * - rightSlot lets pages attach a "See all" link or filter control.
 */
export function SectionHeader({
  title,
  subtitle,
  variant = "default",
  rightSlot,
  className,
  id,
}: SectionHeaderProps) {
  return (
    <header
      className={clsx(
        "flex items-end justify-between gap-4 mb-4",
        variant === "accent-line" && "accent-line pl-3",
        className
      )}
      id={id}
    >
      <div className="min-w-0">
        <h2 className="text-base md:text-lg font-bold text-[var(--text)] truncate">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-xs md:text-sm text-[var(--text-muted)] mt-0.5">
            {subtitle}
          </p>
        ) : null}
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </header>
  );
}
