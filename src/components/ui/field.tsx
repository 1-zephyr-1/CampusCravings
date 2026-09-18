import { useId, type ReactNode } from "react";
import { clsx } from "clsx";

export interface FieldProps {
  /** Visible label text. If omitted, the label element is not rendered but
   *  the `htmlFor`/`id` association still works via `aria-labelledby`. */
  label?: ReactNode;
  /** Required-field marker on the label. Shows the asterisk. */
  required?: boolean;
  /** Associates the label with a control. If `children` is the control, the
   *  `id` is auto-generated and forwarded to it via the `htmlFor` ↔ `id`
   *  pair — pass `htmlFor` only when the control lives outside `children`. */
  htmlFor?: string;
  /** Helper text rendered below the control in `--text-muted`. */
  helperText?: ReactNode;
  /** Error message. Wins over `helperText` when both are set, and tints
   *  the helper row red. The control should also receive the same id via
   *  its own `error` prop (which sets `aria-invalid`). */
  error?: string;
  /** The form control (e.g. `<Input>`, `<Textarea>`, `<Select>`). */
  children: ReactNode;
  /** Wrapper className for layout (e.g. `space-y-1.5`). */
  className?: string;
  /** Label className for size/weight tweaks. */
  labelClassName?: string;
}

/**
 * Composes a labeled form field: label + control + helper/error text.
 *
 * @example
 *   <Field label="Email" htmlFor="email" error={errors.email}>
 *     <Input id="email" type="email" />
 *   </Field>
 */
export function Field({
  label,
  required,
  htmlFor,
  helperText,
  error,
  children,
  className,
  labelClassName,
}: FieldProps) {
  const generatedId = useId();
  const helperId = `${generatedId}-helper`;
  const errorId = `${generatedId}-error`;

  // If htmlFor is provided, the control lives outside `children` and the
  // caller manages its own id. Otherwise the control is `children` and we
  // expect it to receive `id={htmlFor}` itself; we still provide helper/error
  // ids for `aria-describedby` wiring.
  const hasHelper = Boolean(helperText) || Boolean(error);

  return (
    <div className={clsx("space-y-1.5", className)}>
      {label !== undefined && (
        <label
          htmlFor={htmlFor}
          className={clsx(
            "text-sm font-medium text-[var(--text)]",
            labelClassName
          )}
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-[var(--danger)] ml-0.5">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hasHelper && (
        <p
          id={error ? errorId : helperId}
          role={error ? "alert" : undefined}
          className={clsx(
            "text-xs",
            error ? "text-[var(--danger)] font-medium" : "text-[var(--text-muted)]"
          )}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
}
