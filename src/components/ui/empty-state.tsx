import { clsx } from "clsx";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  EmptyIllustration,
  type EmptyIllustrationVariant,
} from "@/components/ui/empty-illustration";

interface EmptyStateProps {
  icon?: ComponentType<{ size?: number; className?: string }>;
  /**
   * Branded SVG illustration. Takes precedence over `icon` when provided.
   * Uses `currentColor`, so color via `text-[var(--primary)]` on the parent.
   */
  illustration?: EmptyIllustrationVariant;
  title?: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Reusable empty state. Used wherever a list returns zero rows.
 * Standardizes the layout, contrast, and CTA convention.
 */
export function EmptyState({
  icon: Icon,
  illustration,
  message,
  title,
  ctaLabel,
  ctaHref,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={clsx(
        "text-center py-16 px-4",
        "rounded-xl border border-dashed border-[var(--border)]",
        className
      )}
    >
      {illustration ? (
        <EmptyIllustration
          variant={illustration}
          className="mx-auto mb-5 w-28 h-28 text-[var(--primary)] opacity-90"
        />
      ) : Icon ? (
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[var(--primary-soft)] flex items-center justify-center">
          <Icon size={26} className="text-[var(--primary)]" />
        </div>
      ) : null}
      {title ? (
        <h3 className="text-base font-semibold text-[var(--text)] mb-1">
          {title}
        </h3>
      ) : null}
      <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
        {message}
      </p>
      {ctaLabel && ctaHref ? (
        <Link
          href={ctaHref}
          className={clsx(
            "inline-flex items-center gap-2 mt-5 px-5 py-2.5",
            "bg-[var(--primary)] text-white rounded-full text-sm font-semibold",
            "hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
          )}
        >
          {ctaLabel}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
