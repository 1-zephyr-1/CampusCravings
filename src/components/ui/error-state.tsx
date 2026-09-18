import { AlertCircle } from "lucide-react";
import { clsx } from "clsx";

interface ErrorStateProps {
  /** Short description of the error shown to the user. */
  error: string;
  /** Optional title above the error message. */
  title?: string;
  /** Optional retry callback. When provided, a "Try again" button is rendered. */
  onRetry?: () => void;
  className?: string;
}

/**
 * Reusable error state for failed data fetches.
 * Uses semantic design tokens for theming and announces itself via role="alert"
 * for screen-reader users.
 */
export function ErrorState({
  error,
  title = "Something went wrong",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5",
        "flex flex-col items-center text-center",
        className
      )}
    >
      <div className="mb-3 w-12 h-12 rounded-full bg-[var(--danger)]/10 flex items-center justify-center">
        <AlertCircle
          size={26}
          className="text-[var(--danger)]"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--text-muted)] max-w-sm break-words">
        {error}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={clsx(
            "mt-4 px-4 py-2 text-xs font-semibold",
            "bg-[var(--primary)] text-white rounded-lg",
            "hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
          )}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
