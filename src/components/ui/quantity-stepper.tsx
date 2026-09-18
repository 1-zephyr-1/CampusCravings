"use client";

import { Minus, Plus } from "lucide-react";
import { clsx } from "clsx";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Accessible label, e.g. "Biryani quantity" */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Accessible quantity stepper. ±Buttons each carry a distinct aria-label
 * that combines the product label with "increase" / "decrease".
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  size = "md",
  className,
}: QuantityStepperProps) {
  const btn =
    size === "sm"
      ? "w-7 h-7"
      : "w-9 h-9";
  const txt = size === "sm" ? "w-6 text-sm" : "w-8 text-base";

  return (
    <div
      role="group"
      aria-label={label}
      className={clsx("inline-flex items-center gap-1.5", className)}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
        className={clsx(
          btn,
          "rounded-md border border-[var(--border)] flex items-center justify-center",
          "text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
          "disabled:opacity-30 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
        )}
      >
        <Minus size={size === "sm" ? 12 : 14} />
      </button>
      <span
        aria-live="polite"
        aria-atomic
        className={clsx(
          txt,
          "text-center font-mono font-bold text-[var(--text)] tabular-nums"
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
        className={clsx(
          btn,
          "rounded-md border border-[var(--border)] flex items-center justify-center",
          "text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
          "disabled:opacity-30 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
        )}
      >
        <Plus size={size === "sm" ? 12 : 14} />
      </button>
    </div>
  );
}
