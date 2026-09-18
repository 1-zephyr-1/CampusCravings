import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderThread } from "@/components/messages/order-thread";
import { ErrorBoundary } from "@/components/dev/error-boundary";

export const metadata: Metadata = {
  title: "Messages · CampusCravings",
  description: "Chat with the seller about your order.",
  robots: { index: false, follow: false },
};

/**
 * Buyer-side realtime message thread for an order.
 *
 * Server component: fetches the order context, authorizes (only the
 * customer on the order may view), then renders the shared
 * `<OrderThread>` client component which handles realtime, optimistic
 * send, and the composer.
 *
 * Symmetric seller-side copy lives at
 * `src/app/(seller)/seller/orders/[orderId]/messages/page.tsx`.
 */
export default async function OrderMessagesPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, customer_id, store_id, store:stores(name, user_id, profile:profiles!stores_user_id_fkey(email, full_name))"
    )
    .eq("id", orderId)
    .single();

  if (!order) redirect("/orders");
  if (order.customer_id !== user.id) redirect("/orders");

  type StoreWithProfile = {
    name?: string;
    profile?: { email?: string; full_name?: string } | null;
  } | null;
  const store = order.store as StoreWithProfile;
  const counterpartName =
    store?.profile?.full_name?.trim() ||
    store?.name ||
    "the seller";

  // Optional offline fallback: real `mailto:` link to the seller.
  const sellerEmail = store?.profile?.email;
  const fallbackHref = sellerEmail
    ? `mailto:${sellerEmail}?subject=${encodeURIComponent(
        `CampusCravings order #${orderId.slice(0, 8)}`
      )}`
    : undefined;

  return (
    <ErrorBoundary>
      <OrderThread
        orderId={order.id}
        viewerRole="customer"
        counterpartName={counterpartName}
        backHref={`/orders/${orderId}`}
        fallback={
          fallbackHref
            ? { label: `Email ${counterpartName} instead`, href: fallbackHref }
            : undefined
        }
      />
    </ErrorBoundary>
  );
}
