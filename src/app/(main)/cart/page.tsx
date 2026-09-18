"use client";

import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import { PickupTimePicker } from "@/components/cart/pickup-time-picker";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { EmptyState } from "@/components/ui/empty-state";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/components/ui/toast";

export default function CartPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const { items: cartItems, setQuantity, remove, clear } = useCart();
  const [placing, setPlacing] = useState(false);
  // Pickup time is per-store (since orders are placed per-store).
  const [pickupTimes, setPickupTimes] = useState<Record<string, string>>({});

  // Group by store
  const groupedByStore = cartItems.reduce((acc, item) => {
    if (!acc[item.store_id]) {
      acc[item.store_id] = { store_name: item.store_name, items: [] };
    }
    acc[item.store_id].items.push(item);
    return acc;
  }, {} as Record<string, { store_name: string; items: typeof cartItems }>);

  async function handlePlaceOrders() {
    if (!user || cartItems.length === 0) return;
    setPlacing(true);

    // Check pending orders
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .in("status", ["requested", "accepted"]);

    if (count && count >= 3) {
      toast("You have too many pending orders.", "error");
      setPlacing(false);
      return;
    }

    // Place one order per store
    for (const [storeId, group] of Object.entries(groupedByStore)) {
      const totalPrice = group.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const pickupIso = pickupTimes[storeId];
      const pickupTimeDisplay = pickupIso
        ? new Date(pickupIso).toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })
        : "Flexible";

      const { data: order } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          store_id: storeId,
          total_price: totalPrice,
          pickup_time: pickupTimeDisplay,
          notes:
            group.items.map((i) => i.notes).filter(Boolean).join("; ") || null,
        })
        .select()
        .single();

      if (order) {
        for (const item of group.items) {
          await supabase.from("order_items").insert({
            order_id: order.id,
            item_id: item.id,
            quantity: item.quantity,
            price_at_time: item.price,
          });
        }

        // Notify seller
        const { data: store } = await supabase
          .from("stores")
          .select("user_id")
          .eq("id", storeId)
          .single();

        if (store) {
          await supabase.from("notifications").insert({
            user_id: store.user_id,
            title: "New Order!",
            message: `You have a new pre-order for ৳${totalPrice.toFixed(0)} (pickup ${pickupTimeDisplay})`,
            link: "/seller/orders",
          });
        }
      }
    }

    clear();
    setPlacing(false);
    router.push("/orders?just_placed=1");
  }

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const allStoresHavePickup = Object.keys(groupedByStore).every(
    (id) => pickupTimes[id]
  );

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold text-[var(--text)] mb-4">Your cart</h1>

      {cartItems.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Browse the feed and add some homemade meals to get started."
          ctaLabel="Browse food"
          ctaHref="/feed"
        />
      ) : (
        <>
          {Object.entries(groupedByStore).map(([storeId, group]) => (
            <div
              key={storeId}
              className="mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden"
            >
              <div className="px-4 pt-3 pb-2 border-b border-[var(--border)] bg-[var(--background)]">
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  {group.store_name}
                </h2>
              </div>
              <ul role="list" className="divide-y divide-[var(--border)]">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)] flex items-center justify-center shrink-0 overflow-hidden">
                      {item.photo_url ? (
                        <Image
                          src={item.photo_url}
                          alt={item.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag size={20} className="text-[var(--text-subtle)]" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] font-mono">
                        ৳{item.price.toFixed(0)} each
                      </p>
                    </div>
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(q) => setQuantity(item.id, q)}
                      min={1}
                      max={20}
                      label={`${item.name} quantity`}
                      size="sm"
                    />
                    <span className="text-sm font-bold font-mono text-[var(--primary)] w-14 text-right">
                      ৳{(item.price * item.quantity).toFixed(0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label={`Remove ${item.name} from cart`}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors motion-reduce:transition-none"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Per-store pickup time */}
              <div className="px-4 py-3 bg-[var(--background)] border-t border-[var(--border)]">
                <PickupTimePicker
                  value={pickupTimes[storeId] || ""}
                  onChange={(iso) =>
                    setPickupTimes((prev) => ({ ...prev, [storeId]: iso }))
                  }
                  id={`pickup-${storeId}`}
                />
              </div>
            </div>
          ))}

          {/* Total + CTA */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--text-muted)]">Total</span>
              <span className="text-xl font-bold font-mono text-[var(--primary)]">
                ৳{total.toFixed(0)}
              </span>
            </div>
            {!allStoresHavePickup && (
              <p
                role="status"
                className="text-xs text-[var(--text-muted)] mb-2"
              >
                Choose a pickup time for each store before placing your order.
              </p>
            )}
            <button
              type="button"
              onClick={handlePlaceOrders}
              disabled={placing || !allStoresHavePickup}
              className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all motion-reduce:transition-none disabled:opacity-50"
            >
              {placing
                ? "Placing orders…"
                : `Place order${cartItems.length > 1 ? "s" : ""} (${cartItems.length} ${cartItems.length === 1 ? "item" : "items"})`}
            </button>
            <p className="mt-2 text-[11px] text-center text-[var(--text-subtle)]">
              You&apos;ll pay in cash when you pick up. No commissions, no
              upfront fees.
            </p>
          </div>
        </>
      )}

      {cartItems.length > 0 && (
        <p className="mt-6 text-center text-xs">
          <Link
            href="/feed"
            className="text-[var(--primary)] hover:underline"
          >
            Keep browsing →
          </Link>
        </p>
      )}
    </div>
  );
}
