"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { Order, OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, Clock } from "lucide-react";

export default function OrdersPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*, store:stores!orders_store_id_fkey(name, pickup_area), items:order_items(*, item:food_items(name, photo_urls))")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });

      setOrders(data || []);
      setLoading(false);
    }

    fetchOrders();

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${user!.id}`,
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id ? { ...o, ...payload.new } : o
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const activeOrders = orders.filter((o) =>
    ["requested", "accepted", "ready"].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ["completed", "declined", "cancelled"].includes(o.status)
  );

  const displayOrders = tab === "active" ? activeOrders : completedOrders;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold text-espresso dark:text-cream mb-4">
        My Orders
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface dark:bg-surface-dark rounded-lg p-1 border border-sand dark:border-[#4A3D30] mb-4">
        <button
          onClick={() => setTab("active")}
          className={clsx(
            "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors",
            tab === "active"
              ? "bg-tomato text-white"
              : "text-bark hover:text-espresso"
          )}
        >
          Active ({activeOrders.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={clsx(
            "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors",
            tab === "completed"
              ? "bg-tomato text-white"
              : "text-bark hover:text-espresso"
          )}
        >
          History ({completedOrders.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-sand/30 dark:bg-[#3A2E20] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : displayOrders.length > 0 ? (
        <div className="space-y-3">
          {displayOrders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                        ORDER_STATUSES[order.status as OrderStatus]?.color
                      )}
                    >
                      {ORDER_STATUSES[order.status as OrderStatus]?.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-espresso dark:text-cream truncate">
                    {order.store?.name}
                  </p>
                  <p className="text-xs text-bark mt-0.5">
                    {order.items?.length || 0} items · Pickup: {order.pickup_time}
                  </p>
                  <p className="text-xs text-bark/50 mt-0.5">
                    <Clock size={10} className="inline mr-1" />
                    {format(new Date(order.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-tomato">
                    ৳{order.total_price.toFixed(0)}
                  </p>
                  <ChevronRight size={16} className="text-bark/30 ml-auto mt-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="text-4xl block mb-3">📦</span>
          <p className="text-sm text-bark">
            {tab === "active" ? "No active orders" : "No order history yet"}
          </p>
          <Link
            href="/feed"
            className="inline-flex mt-3 px-4 py-2 bg-tomato text-white rounded-xl text-sm font-semibold hover:bg-tomato-hover"
          >
            Browse Food
          </Link>
        </div>
      )}
    </div>
  );
}
