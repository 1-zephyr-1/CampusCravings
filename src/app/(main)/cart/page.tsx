"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface CartItemData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  store_id: string;
  store_name: string;
  notes: string;
  photo_url: string | null;
}

export default function CartPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  // For simplicity, cart is managed via localStorage
  // In production, use a proper cart context/provider
  useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("campus-cravings-cart");
      if (stored) {
        setCartItems(JSON.parse(stored));
      }
      setLoading(false);
    }
  });

  function updateQuantity(id: string, delta: number) {
    setCartItems((prev) => {
      const updated = prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0);
      localStorage.setItem("campus-cravings-cart", JSON.stringify(updated));
      return updated;
    });
  }

  function removeItem(id: string) {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("campus-cravings-cart", JSON.stringify(updated));
      return updated;
    });
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Group by store
  const groupedByStore = cartItems.reduce((acc, item) => {
    if (!acc[item.store_id]) {
      acc[item.store_id] = { store_name: item.store_name, items: [] };
    }
    acc[item.store_id].items.push(item);
    return acc;
  }, {} as Record<string, { store_name: string; items: CartItemData[] }>);

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
      alert("You have too many pending orders.");
      setPlacing(false);
      return;
    }

    // Place one order per store
    for (const [storeId, group] of Object.entries(groupedByStore)) {
      const totalPrice = group.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const { data: order } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          store_id: storeId,
          total_price: totalPrice,
          pickup_time: "Flexible",
          notes: group.items.map((i) => i.notes).filter(Boolean).join("; ") || null,
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
            message: `You have a new pre-order for ৳${totalPrice.toFixed(0)}`,
            link: "/seller/orders",
          });
        }
      }
    }

    localStorage.removeItem("campus-cravings-cart");
    setCartItems([]);
    setPlacing(false);
    router.push("/orders");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-sand/30 dark:bg-[#3A2E20] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold text-espresso dark:text-cream mb-4">
        Cart
      </h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={48} className="mx-auto text-bark/30 mb-3" />
          <p className="text-bark mb-4">Your cart is empty</p>
          <Link
            href="/feed"
            className="inline-flex px-4 py-2 bg-tomato text-white rounded-xl text-sm font-semibold hover:bg-tomato-hover"
          >
            Browse Food
          </Link>
        </div>
      ) : (
        <>
          {Object.entries(groupedByStore).map(([storeId, group]) => (
            <div key={storeId} className="mb-6">
              <h2 className="accent-line text-sm font-semibold text-espresso dark:text-cream mb-3">
                {group.store_name}
              </h2>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-tomato/5 to-turmeric/5 flex items-center justify-center text-xl shrink-0">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        "🍽️"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-espresso dark:text-cream truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-bark font-mono">
                        ৳{item.price.toFixed(0)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-7 h-7 rounded-md border border-sand dark:border-[#4A3D30] flex items-center justify-center text-bark"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-mono font-bold text-espresso dark:text-cream">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-7 h-7 rounded-md border border-sand dark:border-[#4A3D30] flex items-center justify-center text-bark"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-bold font-mono text-tomato w-14 text-right">
                      ৳{(item.price * item.quantity).toFixed(0)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-bark hover:text-chili"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-bark">Total</span>
              <span className="text-xl font-bold font-mono text-tomato">
                ৳{total.toFixed(0)}
              </span>
            </div>
            <button
              onClick={handlePlaceOrders}
              disabled={placing}
              className="w-full py-3 bg-tomato text-white rounded-xl font-semibold text-sm hover:bg-tomato-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {placing ? "Placing Orders..." : `Place Order (${cartItems.length} items)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
