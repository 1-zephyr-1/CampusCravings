"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "./toast";

export type LoadingButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";
export type LoadingButtonSize = "sm" | "md" | "lg";

export interface LoadingButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Visual style. */
  variant?: LoadingButtonVariant;
  /** Size scale. */
  size?: LoadingButtonSize;
  /**
   * Click handler. If it returns a promise, the button enters its loading
   * state until the promise settles. Errors are caught and surfaced as a
   * toast — never silently swallowed.
   */
  onClick?: (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void | Promise<unknown>;
  /** Whether the button is in its loading state. Skips auto-management. */
  loading?: boolean;
  /** Label/content shown when not loading. Required. */
  children: React.ReactNode;
}

/**
 * Variant → background / border / text color tokens.
 * Hover and disabled states follow the same conventions used elsewhere in
 * the app (see profile/edit, cart, auth-card).
 */
const variantStyles: Record<LoadingButtonVariant, string> = {
  primary:
    "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] focus-visible:ring-[var(--primary)]/40",
  secondary:
    "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:ring-[var(--primary)]/30",
  ghost:
    "bg-transparent text-[var(--text)] hover:bg-[var(--bg)] focus-visible:ring-[var(--text-muted)]/20",
  danger:
    "bg-[var(--danger)] text-white hover:opacity-90 focus-visible:ring-[var(--danger)]/40",
};

const sizeStyles: Record<LoadingButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

const spinnerSizes: Record<LoadingButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

/**
 * Button primitive that automatically tracks an internal `isLoading` state
 * when given an async `onClick`. While loading, it disables itself, swaps
 * the label for a spinning Loader2, exposes `aria-busy`, and swallows any
 * thrown error into a toast (no silent failures).
 *
 * Matches the manual button pattern in profile/edit and cart but extracted
 * so it can be reused across the app.
 */
export const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps
>(function LoadingButton(
  {
    variant = "primary",
    size = "md",
    onClick,
    loading: loadingProp,
    disabled,
    children,
    type = "button",
    className,
    ...rest
  },
  ref,
) {
  const [internalLoading, setInternalLoading] = React.useState(false);

  // Allow external control if the consumer wants to drive the state.
  const isLoading = loadingProp ?? internalLoading;
  const isDisabled = disabled || isLoading;

  const handleClick = React.useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick) return;
      // If the consumer handed us a sync handler, don't flip into loading.
      const result = onClick(event);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        try {
          setInternalLoading(true);
          await result;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.";
          toast(message, "error");
        } finally {
          setInternalLoading(false);
        }
      }
    },
    [onClick],
  );

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      onClick={handleClick}
      className={clsx(
        // Layout
        "inline-flex items-center justify-center font-semibold whitespace-nowrap",
        // Interaction / focus
        "transition-colors motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        // Disabled
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        // Variant + size
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2
            size={spinnerSizes[size]}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

LoadingButton.displayName = "LoadingButton";
