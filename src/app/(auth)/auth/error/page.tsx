import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Sign-in problem — CampusCravings",
  description: "We couldn't complete your sign-in. Please try again.",
};

/**
 * Friendly landing for any auth-callback failure (OAuth bounce-back, bad
 * email domain, expired link, missing PKCE code, etc.). The callback route
 * appends a short human-readable message via `?error=`. We fall back to a
 * generic message when none is supplied.
 */
export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthErrorInner searchParams={searchParams} />
    </Suspense>
  );
}

function AuthErrorFallback() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 shadow-sm h-[280px]" />
      </div>
    </div>
  );
}

async function AuthErrorInner({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const raw = params.error?.trim();
  const message =
    raw && raw.length > 0
      ? raw
      : "We couldn't complete your sign-in. The link may have expired.";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <EmptyState
          icon={AlertCircle}
          title="Sign-in didn't work"
          message={message}
          ctaLabel="Try signing in again"
          ctaHref="/#auth"
        >
          <div className="mt-4 flex flex-col items-center gap-2 text-xs text-[var(--text-muted)]">
            <Link
              href="/forgot-password"
              className="text-[var(--primary)] hover:underline font-medium"
            >
              Forgot your password?
            </Link>
            <Link href="/" className="hover:text-[var(--text)]">
              Go home
            </Link>
          </div>
        </EmptyState>
      </div>
    </div>
  );
}
