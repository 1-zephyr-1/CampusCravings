import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, MessageSquare, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Messages · CampusCravings",
  description: "Chat with the buyer about this order.",
  robots: { index: false, follow: false },
};

/**
 * Seller-side messaging thread for an order.
 *
 * Symmetric copy of `src/app/(main)/orders/[orderId]/messages/page.tsx`.
 * Full realtime chat is Phase 3; for now we link back to the order and show a
 * real mailto: to the buyer.
 */
export default async function SellerOrderMessagesPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, store_id, total_price, pickup_time, notes, customer:profiles!orders_customer_id_fkey(email, full_name), store:stores(user_id)"
    )
    .eq("id", orderId)
    .single();

  const store = order?.store as { user_id?: string } | null | undefined;

  if (!order || store?.user_id !== user.id) {
    redirect("/seller/orders");
  }

  const customer = order.customer as
    | { email?: string; full_name?: string }
    | null
    | undefined;

  const buyerEmail = customer?.email;
  const buyerName = customer?.full_name || "the buyer";

  const mailSubject = encodeURIComponent(
    `CampusCravings order #${orderId.slice(0, 8)}`
  );
  const mailBody = encodeURIComponent(
    [
      `Hi ${buyerName},`,
      "",
      "Reaching out about your CampusCravings order.",
      "",
      `Order ID: ${orderId}`,
      `Total: ৳${order?.total_price ?? "?"}`,
      `Pickup time: ${order?.pickup_time ?? "(not set)"}`,
      order?.notes ? `Notes: ${order.notes}` : "",
      "",
      "Thanks!",
    ]
      .filter(Boolean)
      .join("\n")
  );

  const mailtoHref = buyerEmail
    ? `mailto:${buyerEmail}?subject=${mailSubject}&body=${mailBody}`
    : null;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-8"
    >
      <Link
        href={`/seller/orders/${orderId}`}
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
          meantime, you can email {buyerName} directly using the button below
          — they&apos;ll see your pickup time and order details in their
          dashboard.
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
            Accept or decline incoming orders from the orders tab
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--success)] mt-0.5" aria-hidden="true">
              ✓
            </span>
            Mark orders as ready when packed, completed when picked up
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--success)] mt-0.5" aria-hidden="true">
              ✓
            </span>
            Toggle items as sold-out from the items page
          </li>
        </ul>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        {mailtoHref ? (
          <a
            href={mailtoHref}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-full text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
          >
            <Mail size={14} aria-hidden="true" />
            Email {buyerName}
          </a>
        ) : (
          <span className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)]/60 text-white rounded-full text-sm font-semibold cursor-not-allowed">
            <Mail size={14} aria-hidden="true" />
            Buyer email unavailable
          </span>
        )}
        <Link
          href={`/seller/orders/${orderId}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-full text-sm font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
        >
          View order details
        </Link>
        <Link
          href="/seller/orders"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-full text-sm font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
        >
          All orders
        </Link>
      </div>

      <p className="mt-6 text-[11px] text-center text-[var(--text-subtle)]">
        Order ID: <code className="font-mono">{orderId.slice(0, 8)}</code>
      </p>
    </main>
  );
}
