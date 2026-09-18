import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ChefHat, Mail, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Awaiting approval · CampusCravings",
  description:
    "Your seller application is being reviewed. We'll notify you as soon as you're approved.",
  robots: { index: false, follow: false },
};

/**
 * Friendly landing page for sellers whose role is "seller" but
 * `is_approved` is still false. Replaces the silent bounce to /onboarding
 * with a clear status + next-steps message.
 *
 * Middleware redirects unapproved sellers here from any /seller/* route.
 * The parent (seller) layout already renders <main id="main-content">, so
 * we keep this body fragment-only.
 */
export default function SellerPendingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-12 md:py-20 animate-fade-in motion-reduce:animate-none">
      <div className="text-center mb-8">
        <div
          aria-hidden="true"
          className="w-16 h-16 rounded-2xl bg-[var(--warning-soft)] text-[var(--warning)] flex items-center justify-center mx-auto mb-5"
        >
          <Clock size={28} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] tracking-tight">
          Your seller application is being reviewed
        </h1>
        <p className="mt-3 text-base text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
          Thanks for signing up to sell on CampusCravings! We&apos;re checking
          your details now. Most applications are approved within
          <strong> 24–48 hours</strong>.
        </p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-[var(--text)]">
          What happens next
        </h2>
        <ol className="space-y-3 text-sm text-[var(--text-muted)]">
          <li className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-bold flex items-center justify-center mt-0.5"
            >
              1
            </span>
            <span>
              <strong className="text-[var(--text)]">
                We review your seller profile.
              </strong>{" "}
              Our moderators verify BRACU email and confirm your kitchen can
              safely serve pickup-only orders.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-bold flex items-center justify-center mt-0.5"
            >
              2
            </span>
            <span>
              <strong className="text-[var(--text)]">You get an email.</strong>{" "}
              We&apos;ll send a notification the moment your account is
              approved, with a direct link to your seller dashboard.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-bold flex items-center justify-center mt-0.5"
            >
              3
            </span>
            <span>
              <strong className="text-[var(--text)]">Add your first dish.</strong>{" "}
              Set your pickup spot, photos, and pricing — you&apos;ll be live
              in minutes.
            </span>
          </li>
        </ol>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <Link
          href="/feed"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-full text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Browse the feed while you wait
        </Link>
        <a
          href="mailto:support@campuscravings.app"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-full text-sm font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
        >
          <Mail size={14} aria-hidden="true" />
          Contact support
        </a>
      </div>

      <p className="mt-8 text-center text-xs text-[var(--text-subtle)] flex items-center justify-center gap-1.5">
        <ChefHat size={12} aria-hidden="true" />
        While you wait, you can still browse the feed and pre-order from other
        sellers.
      </p>
    </div>
  );
}