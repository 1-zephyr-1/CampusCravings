"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, Home } from "lucide-react";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-[60vh] flex items-center justify-center px-6"
    >
      <div className="text-center max-w-md">
        <div
          aria-hidden="true"
          className="w-16 h-16 bg-[var(--danger)]/10 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <AlertCircle size={32} className="text-[var(--danger)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          We couldn&apos;t load this page. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-lg font-medium text-sm hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
          >
            <Home size={14} aria-hidden="true" />
            Go home
          </Link>
        </div>
        {process.env.NODE_ENV !== "production" && error?.message && (
          <p className="mt-6 text-xs font-mono text-[var(--text-subtle)] break-words">
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
}
