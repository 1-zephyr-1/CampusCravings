"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { Order, OrderStatus, Store } from "@/types";
import { ORDER_STATUSES, MAX_PENDING_ORDERS } from "@/lib/constants";
import { format } from "date-fns";
import { clsx } from "clsx";
import {
  Check,
  X,
  ChefHat,
  PackageCheck,
  Clock,
  MessageSquare,
  RefreshCw,
} from "lucide-react";

export default function SellerOrdersPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"incoming" | "active" | "completed">(
    "incoming"
  );

  const fetchOrders = useCallback(async () => {
    if (!store) return;

    const { data } = await supabase
      .from("orders")
      .select(
        "*, customer:profiles!orders_customer_id_fkey(full_name), items:order_items(*, item:food_items(name, price, photo_urls))"
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    setOrders(data || []);
    setLoading(false);
  }, [store, supabase]);

  useEffect(() => {
    if (!profile) return;

    async function init() {
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", profile!.id)
        .single();

      setStore(storeData);
    }

    init();
  }, [profile]);

  useEffect(() => {
    if (!store) return;
    fetchOrders();

    const channel = supabase
      .channel("seller-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${store.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store, fetchOrders]);

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    await supabase.from("orders").update({ status }).eq("id", orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    setUpdatingId(null);
  }

  const pendingOrders = orders.filter((o) => o.status === "requested");
  const activeOrders = orders.filter((o) =>
    ["accepted", "ready"].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ["completed", "declined", "cancelled"].includes(o.status)
  );

  const displayOrders =
    tab === "incoming"
      ? pendingOrders
      : tab === "active"
        ? activeOrders
        : completedOrders;

  const tabs = [
    { key: "incoming" as const, label: "Incoming", count: pendingOrders.length },
    { key: "active" as const, label: "Active", count: activeOrders.length },
    {
      key: "completed" as const,
      label: "Completed",
      count: completedOrders.length,
    },
  ];

  function getAnonymizedName(order: Order) {
    if (!order.customer?.full_name) return "Student";
    const parts = order.customer.full_name.split(" ");
    if (parts.length <= 1) return parts[0][0] + "***";
    return parts[0] + " " + parts[parts.length - 1][0] + ".";
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-espresso dark:text-cream">
          Orders
        </h1>
        {store && (
          <span
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-semibold",
              store.is_open ? "bg-herb/20 text-herb" : "bg-bark/20 text-bark"
            )}
          >
            {store.is_open ? "Store Open" : "Store Closed"}
          </span>
        )}
      </div>

      {pendingOrders.length >= MAX_PENDING_ORDERS && (
        <div className="mb-4 p-3 bg-turmeric/10 border border-turmeric/30 rounded-xl">
          <p className="text-xs font-medium text-turmeric">
            You have {MAX_PENDING_ORDERS} pending orders. Accept or decline
            incoming orders before taking new ones.
          </p>
        </div>
      )}

      <div className="flex gap-1 bg-surface dark:bg-surface-dark rounded-lg p-1 border border-sand dark:border-[#4A3D30] mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors",
              tab === t.key
                ? "bg-tomato text-white"
                : "text-bark hover:text-espresso"
            )}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-sand/30 dark:bg-[#3A2E20] rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : displayOrders.length > 0 ? (
        <div className="space-y-3">
          {displayOrders.map((order) => (
            <div
              key={order.id}
              className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                        ORDER_STATUSES[order.status]?.color
                      )}
                    >
                      {ORDER_STATUSES[order.status]?.label}
                    </span>
                    <span className="text-[10px] text-bark/50">
                      #{order.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-espresso dark:text-cream">
                    {getAnonymizedName(order)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-tomato">
                    ৳{order.total_price.toFixed(0)}
                  </p>
                  <p className="text-[10px] text-bark/50 font-mono">
                    <Clock size={10} className="inline mr-0.5" />
                    {order.pickup_time}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                {order.items?.map((oi) => (
                  <div
                    key={oi.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-bark truncate">
                      {oi.quantity}× {oi.item?.name || "Item"}
                    </span>
                    <span className="font-mono text-espresso dark:text-cream shrink-0 ml-2">
                      ৳{(oi.price_at_time * oi.quantity).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="flex items-start gap-1.5 mb-3 p-2 bg-cream dark:bg-cream-dark rounded-lg">
                  <MessageSquare
                    size={12}
                    className="text-bark shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-bark">{order.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                {order.status === "requested" && (
                  <>
                    <button
                      onClick={() => updateOrderStatus(order.id, "declined")}
                      disabled={updatingId === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full border border-chili/30 text-chili text-xs font-semibold hover:bg-chili/10 transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                      Decline
                    </button>
                    <button
                      onClick={() => updateOrderStatus(order.id, "accepted")}
                      disabled={
                        updatingId === order.id ||
                        pendingOrders.length >= MAX_PENDING_ORDERS
                      }
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-herb text-white text-xs font-semibold hover:bg-herb/90 transition-colors disabled:opacity-50"
                    >
                      <Check size={14} />
                      Accept
                    </button>
                  </>
                )}
                {order.status === "accepted" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "ready")}
                    disabled={updatingId === order.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-turmeric text-espresso text-xs font-semibold hover:bg-turmeric/90 transition-colors disabled:opacity-50"
                  >
                    <ChefHat size={14} />
                    Mark Ready
                  </button>
                )}
                {order.status === "ready" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "completed")}
                    disabled={updatingId === order.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-herb text-white text-xs font-semibold hover:bg-herb/90 transition-colors disabled:opacity-50"
                  >
                    <PackageCheck size={14} />
                    Mark Completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <RefreshCw size={32} className="mx-auto mb-3 text-bark/30" />
          <p className="text-sm text-bark">
            {tab === "incoming"
              ? "No incoming orders"
              : tab === "active"
                ? "No active orders"
                : "No completed orders"}
          </p>
        </div>
      )}
    </div>
  );
}
