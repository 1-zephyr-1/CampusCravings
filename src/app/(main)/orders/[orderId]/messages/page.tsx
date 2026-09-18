import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, MessageSquare, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Messages · CampusCravings",
  description: "Chat with the seller about your order.",
  robots: { index: false, follow: false },
};

/**
 * In-app messaging thread between customer and seller.
 *
 * Stub implementation for Phase 1 — full realtime chat over Supabase
 * Realtime is tracked as a follow-up. This page renders an empty state
 * with a friendly explanation + a fallback to email.
 *
 * The URL is shared between customer (`/orders/[orderId]/messages`) and
 * seller (`/seller/orders/[orderId]/messages`) — both route groups have
 * a copy of this file in Phase 1; in Phase 2 we'll move it to a shared
 * `(shared)` route group.
 */
export default async function OrderMessagesPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-8"
    >
      <Link
        href={`/orders/${orderId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors motion-reduce:transition-none"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Back to order
      </Link>

      <div className="text-center mb-6">
        <div
          aria-hidden="true"
          className="w-14 h-14 rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center mx-auto mb-4"
        >
          <MessageSquare size={24} />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Direct messages coming soon
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
          We&apos;re building realtime chat between buyers and sellers. In the
          meantime, you can reach the seller by phone or email — they&apos;ll
          see your pickup time and order details in their dashboard.
        </p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          What you can do today
        </h2>
        <ul className="space-y-2 text-sm text-[var(--text-muted)]">
          <li className="flex items-start gap-2">
            <span className="text-[var(--success)] mt-0.5" aria-hidden="true">
              ✓
            </span>
            Add pickup-time or special-request notes{" "}
            <em className="not-italic text-[var(--text-subtle)]">
              (before the seller accepts)
            </em>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--success)] mt-0.5" aria-hidden="true">
              ✓
            </span>
            Cancel your order if plans change
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--success)] mt-0.5" aria-hidden="true">
              ✓
            </span>
            Rate and review after pickup
          </li>
        </ul>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-full text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
        >
          <Sparkles size={14} aria-hidden="true" />
          View order details
        </Link>
        <Link
          href="/orders"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-full text-sm font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
        >
          All my orders
        </Link>
      </div>

      <p className="mt-6 text-[11px] text-center text-[var(--text-subtle)]">
        Order ID: <code className="font-mono">{orderId.slice(0, 8)}</code>
      </p>
    </main>
  );
}