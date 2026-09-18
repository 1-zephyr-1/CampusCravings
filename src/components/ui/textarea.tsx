"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type TextareaHTMLAttributes,
} from "react";
import { clsx } from "clsx";

export type TextareaSize = "sm" | "md";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Size variant. `md` is the default. */
  size?: TextareaSize;
  /** Error message. Renders helper text below in `--danger` when set. */
  error?: string;
  /** Optional id of the element describing the textarea (e.g. helper text). */
  helperId?: string;
  /** Auto-grow the textarea to fit its content. Off by default. */
  autoGrow?: boolean;
  /** Min height in px when `autoGrow` is on. */
  minHeight?: number;
  /** Max height in px when `autoGrow` is on (default: 320). */
  maxHeight?: number;
}

const SIZE_CLASSES: Record<TextareaSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
};

/**
 * Multi-line text input with the same visual language as `<Input>`. Set
 * `autoGrow` to grow the textarea with its content (clamped between
 * `minHeight` and `maxHeight`). Use with `<Field>` for label + error.
 *
 * @example
 *   <Textarea autoGrow placeholder="Tell us about the dish..." />
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      size = "md",
      error,
      helperId,
      autoGrow = false,
      minHeight,
      maxHeight = 320,
      className,
      onInput,
      "aria-invalid": ariaInvalid,
      ...props
    },
    forwardedRef
  ) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);

    // Recompute height whenever the value changes (controlled) or on resize.
    useEffect(() => {
      if (!autoGrow) return;
      const el = innerRef.current;
      if (!el) return;

      const adjust = () => {
        // Reset so scrollHeight reflects natural content height.
        el.style.height = "auto";
        const next = Math.min(
          el.scrollHeight,
          maxHeight
        );
        el.style.height = `${Math.max(next, minHeight ?? 0)}px`;
        el.style.overflowY =
          el.scrollHeight > maxHeight ? "auto" : "hidden";
      };

      adjust();
      // Also adjust on the next tick in case the value was set before mount.
      const t = window.setTimeout(adjust, 0);
      window.addEventListener("resize", adjust);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("resize", adjust);
      };
    }, [autoGrow, maxHeight, minHeight, props.value, props.defaultValue]);

    return (
      <textarea
        ref={innerRef}
        aria-invalid={ariaInvalid ?? (error ? true : undefined)}
        aria-describedby={helperId}
        onInput={(e) => {
          if (autoGrow) {
            const el = e.currentTarget;
            el.style.height = "auto";
            const next = Math.min(el.scrollHeight, maxHeight);
            el.style.height = `${Math.max(next, minHeight ?? 0)}px`;
            el.style.overflowY =
              el.scrollHeight > maxHeight ? "auto" : "hidden";
          }
          onInput?.(e);
        }}
        className={clsx(
          "w-full rounded-xl text-[var(--text)] placeholder:text-[var(--text-subtle)]",
          "bg-[var(--surface)] border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30",
          "transition-colors motion-reduce:transition-none",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "resize-none",
          error
            ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/30"
            : "border-[var(--border)] focus:border-[var(--primary)]",
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      />
    );
  }
);
