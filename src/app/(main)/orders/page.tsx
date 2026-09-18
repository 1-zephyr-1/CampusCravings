"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Order, OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";
import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRight, Clock, Package } from "lucide-react";

export default function OrdersPage() {
  const { user } = useAuth();
  const supabase = useSupabase();
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
  }, [user, supabase]);

  const activeOrders = orders.filter((o) =>
    ["requested", "accepted", "ready"].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ["completed", "declined", "cancelled"].includes(o.status)
  );

  const displayOrders = tab === "active" ? activeOrders : completedOrders;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold text-[var(--text)] mb-4">
        My Orders
      </h1>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Order status"
        className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)] mb-4"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "active"}
          onClick={() => setTab("active")}
          className={clsx(
            "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors motion-reduce:transition-none",
            tab === "active"
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          Active ({activeOrders.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "completed"}
          onClick={() => setTab("completed")}
          className={clsx(
            "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors motion-reduce:transition-none",
            tab === "completed"
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          History ({completedOrders.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-label="Loading orders" role="status">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : displayOrders.length > 0 ? (
        <div className="space-y-3">
          {displayOrders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors motion-reduce:transition-none"
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
                  <p className="text-sm font-medium text-[var(--text)] truncate">
                    {order.store?.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {order.items?.length || 0} items · Pickup: {order.pickup_time}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5 flex items-center gap-1">
                    <Clock size={10} aria-hidden="true" />
                    {format(new Date(order.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-[var(--primary)]">
                    ৳{order.total_price.toFixed(0)}
                  </p>
                  <ChevronRight size={16} className="text-[var(--text-subtle)] ml-auto mt-2" aria-hidden="true" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title={tab === "active" ? "No active orders" : "No order history yet"}
          message={
            tab === "active"
              ? "When you place an order, you'll see it here as it progresses."
              : "Once an order is completed, declined, or cancelled, it'll appear here."
          }
          ctaLabel="Browse food"
          ctaHref="/feed"
        />
      )}
    </div>
  );
}
