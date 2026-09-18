import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderThread } from "@/components/messages/order-thread";

export const metadata: Metadata = {
  title: "Messages · CampusCravings",
  description: "Chat with the buyer about this order.",
  robots: { index: false, follow: false },
};

/**
 * Seller-side realtime message thread for an order.
 *
 * Symmetric mirror of `src/app/(main)/orders/[orderId]/messages/page.tsx`.
 * Server component: authorizes (only the seller who owns the store may view)
 * and renders the shared `<OrderThread>` with `viewerRole="seller"`.
 */
export default async function SellerOrderMessagesPage({
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
      "id, store_id, customer_id, store:stores(user_id), customer:profiles!orders_customer_id_fkey(email, full_name)"
    )
    .eq("id", orderId)
    .single();

  type StoreForSeller = { user_id?: string } | null;
  const store = order?.store as StoreForSeller;

  if (!order || store?.user_id !== user.id) {
    redirect("/seller/orders");
  }

  type CustomerRow = { email?: string; full_name?: string } | null;
  const customer = order.customer as CustomerRow;
  const counterpartName = customer?.full_name?.trim() || "the buyer";

  // Optional offline fallback: real `mailto:` link to the buyer.
  const buyerEmail = customer?.email;
  const fallbackHref = buyerEmail
    ? `mailto:${buyerEmail}?subject=${encodeURIComponent(
        `CampusCravings order #${orderId.slice(0, 8)}`
      )}`
    : undefined;

  return (
    <OrderThread
      orderId={order.id}
      viewerRole="seller"
      counterpartName={counterpartName}
      backHref={`/seller/orders/${orderId}`}
      fallback={
        fallbackHref
          ? { label: `Email ${counterpartName} instead`, href: fallbackHref }
          : undefined
      }
    />
  );
}
