import { forwardRef, type SelectHTMLAttributes } from "react";
import { clsx } from "clsx";

export type SelectSize = "sm" | "md";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Size variant. `md` is the default. */
  size?: SelectSize;
  /** Error message. Renders helper text below in `--danger` when set. */
  error?: string;
  /** Optional id of the element describing the select (e.g. helper text). */
  helperId?: string;
}

const SIZE_CLASSES: Record<SelectSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
};

/**
 * Native `<select>` with the app's input styling. Custom caret via inline
 * background-image so it adapts to the active theme.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    size = "md",
    error,
    helperId,
    className,
    "aria-invalid": ariaInvalid,
    children,
    ...props
  },
  ref
) {
  // Inline SVG caret — uses currentColor so it inherits `text-[var(--text-muted)]`.
  const caret =
    "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e\")";

  return (
    <select
      ref={ref}
      aria-invalid={ariaInvalid ?? (error ? true : undefined)}
      aria-describedby={helperId}
      className={clsx(
        "w-full rounded-xl text-[var(--text)]",
        "bg-[var(--surface)] border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30",
        "transition-colors motion-reduce:transition-none",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "appearance-none pr-9",
        error
          ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/30"
          : "border-[var(--border)] focus:border-[var(--primary)]",
        SIZE_CLASSES[size],
        className
      )}
      style={{
        backgroundImage: caret,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.75rem center",
        backgroundSize: "0.85rem",
      }}
      {...props}
    >
      {children}
    </select>
  );
});
