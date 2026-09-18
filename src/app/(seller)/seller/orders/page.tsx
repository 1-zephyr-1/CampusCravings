"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Order, OrderStatus, Store } from "@/types";
import { ORDER_STATUSES, MAX_PENDING_ORDERS } from "@/lib/constants";

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
  const supabase = useSupabase();
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"incoming" | "active" | "completed">(
    "incoming"
  );
  const initialized = useRef(false);

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
    if (!initialized.current) {
      initialized.current = true;
      fetchOrders();
    }

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
        <h1 className="text-xl font-bold text-gray-900">
          Orders
        </h1>
        {store && (
          <span
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-semibold",
              store.is_open ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
            )}
          >
            {store.is_open ? "Store Open" : "Store Closed"}
          </span>
        )}
      </div>

      {pendingOrders.length >= MAX_PENDING_ORDERS && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-medium text-amber-500">
            You have {MAX_PENDING_ORDERS} pending orders. Accept or decline
            incoming orders before taking new ones.
          </p>
        </div>
      )}

      <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors",
              tab === t.key
                ? "bg-red-600 text-white"
                : "text-gray-500 hover:text-gray-900"
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
              className="h-32 bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : displayOrders.length > 0 ? (
        <div className="space-y-3">
          {displayOrders.map((order) => (
            <div
              key={order.id}
              className="p-4 bg-white rounded-xl border border-gray-200"
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
                    <span className="text-[10px] text-gray-400">
                      #{order.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {getAnonymizedName(order)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-red-600">
                    ৳{order.total_price.toFixed(0)}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
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
                    <span className="text-gray-500 truncate">
                      {oi.quantity}× {oi.item?.name || "Item"}
                    </span>
                    <span className="font-mono text-gray-900 shrink-0 ml-2">
                      ৳{(oi.price_at_time * oi.quantity).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="flex items-start gap-1.5 mb-3 p-2 bg-gray-50 rounded-lg">
                  <MessageSquare
                    size={12}
                    className="text-gray-500 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-gray-500">{order.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                {order.status === "requested" && (
                  <>
                    <button
                      onClick={() => updateOrderStatus(order.id, "declined")}
                      disabled={updatingId === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
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
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
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
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    <ChefHat size={14} />
                    Mark Ready
                  </button>
                )}
                {order.status === "ready" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "completed")}
                    disabled={updatingId === order.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
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
          <RefreshCw size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">
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
