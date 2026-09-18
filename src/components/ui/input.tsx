import { forwardRef, type InputHTMLAttributes } from "react";
import { clsx } from "clsx";

export type InputSize = "sm" | "md";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Size variant. `md` matches the app's default; `sm` is for compact rows. */
  size?: InputSize;
  /** Error message. When set, the input gets a danger border and helper text
   *  renders below in `--danger`. The input's `aria-invalid` and
   *  `aria-describedby` are wired automatically when paired with a label. */
  error?: string;
  /** Optional id of the element describing the input (e.g. helper text). */
  helperId?: string;
}

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
};

/**
 * Standard text input. Wraps the native `<input>` with the app's input
 * styling (`bg-[var(--surface)]`, `border-[var(--border)]`, rounded, focus
 * ring on `--primary`). Use with `<Field>` for label + helper + error.
 *
 * @example
 *   <Input id="email" type="email" placeholder="you@g.bracu.ac.bd" />
 *   <Input size="sm" error={errors.email} />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = "md",
    error,
    helperId,
    className,
    type = "text",
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={ariaInvalid ?? (error ? true : undefined)}
      aria-describedby={helperId}
      className={clsx(
        "w-full rounded-xl text-[var(--text)] placeholder:text-[var(--text-subtle)]",
        "bg-[var(--surface)] border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30",
        "transition-colors motion-reduce:transition-none",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        error
          ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/30"
          : "border-[var(--border)] focus:border-[var(--primary)]",
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
});
