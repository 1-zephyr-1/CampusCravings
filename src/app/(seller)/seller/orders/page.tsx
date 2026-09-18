"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Order, OrderStatus, Store } from "@/types";
import { ORDER_STATUSES, MAX_PENDING_ORDERS } from "@/lib/constants";

import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  }, [profile, supabase]);

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
  }, [store, fetchOrders, supabase]);

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
        <h1 className="text-xl font-bold text-[var(--text)]">Orders</h1>
        {store && (
          <span
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-semibold",
              store.is_open
                ? "bg-[var(--success)]/15 text-[var(--success)]"
                : "bg-[var(--background)] text-[var(--text-muted)]"
            )}
          >
            {store.is_open ? "Store open" : "Store closed"}
          </span>
        )}
      </div>

      {pendingOrders.length >= MAX_PENDING_ORDERS && (
        <div
          role="status"
          className="mb-4 p-3 bg-[var(--warning-soft)] border border-[var(--warning)]/30 rounded-xl"
        >
          <p className="text-xs font-medium text-[var(--warning)]">
            You have {MAX_PENDING_ORDERS} pending orders. Accept or decline
            incoming orders before taking new ones.
          </p>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Order status"
        className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)] mb-4"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors motion-reduce:transition-none",
              tab === t.key
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3" aria-label="Loading orders" role="status">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : displayOrders.length > 0 ? (
        <ul role="list" className="space-y-3">
          {displayOrders.map((order) => (
            <li
              key={order.id}
              className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
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
                    <span className="text-[10px] text-[var(--text-subtle)] font-mono">
                      #{order.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {getAnonymizedName(order)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-[var(--primary)]">
                    ৳{order.total_price.toFixed(0)}
                  </p>
                  <p className="text-[10px] text-[var(--text-subtle)] font-mono flex items-center justify-end gap-0.5">
                    <Clock size={10} aria-hidden="true" />
                    {order.pickup_time}
                  </p>
                </div>
              </div>

              <ul role="list" className="space-y-1.5 mb-3">
                {order.items?.map((oi) => (
                  <li
                    key={oi.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-[var(--text-muted)] truncate">
                      {oi.quantity}× {oi.item?.name || "Item"}
                    </span>
                    <span className="font-mono text-[var(--text)] shrink-0 ml-2">
                      ৳{(oi.price_at_time * oi.quantity).toFixed(0)}
                    </span>
                  </li>
                ))}
              </ul>

              {order.notes && (
                <div className="flex items-start gap-1.5 mb-3 p-2 bg-[var(--background)] rounded-lg">
                  <MessageSquare
                    size={12}
                    className="text-[var(--text-muted)] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-[var(--text-muted)]">
                    {order.notes}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {order.status === "requested" && (
                  <>
                    <button
                      type="button"
                      onClick={() => updateOrderStatus(order.id, "declined")}
                      disabled={updatingId === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full border border-[var(--danger)]/40 text-[var(--danger)] text-xs font-semibold hover:bg-[var(--danger)]/5 transition-colors motion-reduce:transition-none disabled:opacity-50"
                    >
                      <X size={14} aria-hidden="true" />
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => updateOrderStatus(order.id, "accepted")}
                      disabled={
                        updatingId === order.id ||
                        pendingOrders.length >= MAX_PENDING_ORDERS
                      }
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-[var(--success)] text-white text-xs font-semibold hover:bg-[var(--success)]/90 transition-colors motion-reduce:transition-none disabled:opacity-50"
                    >
                      <Check size={14} aria-hidden="true" />
                      Accept
                    </button>
                  </>
                )}
                {order.status === "accepted" && (
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(order.id, "ready")}
                    disabled={updatingId === order.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-[var(--warning)] text-white text-xs font-semibold hover:bg-[var(--warning)]/90 transition-colors motion-reduce:transition-none disabled:opacity-50"
                  >
                    <ChefHat size={14} aria-hidden="true" />
                    Mark ready
                  </button>
                )}
                {order.status === "ready" && (
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(order.id, "completed")}
                    disabled={updatingId === order.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-[var(--success)] text-white text-xs font-semibold hover:bg-[var(--success)]/90 transition-colors motion-reduce:transition-none disabled:opacity-50"
                  >
                    <PackageCheck size={14} aria-hidden="true" />
                    Mark completed
                  </button>
                )}
                <LinkForOrder orderId={order.id} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={RefreshCw}
          title={
            tab === "incoming"
              ? "No incoming orders"
              : tab === "active"
                ? "No active orders"
                : "No completed orders yet"
          }
          message={
            tab === "incoming"
              ? "New pre-orders from buyers will appear here."
              : tab === "active"
                ? "Once you accept an order, it'll show up here."
                : "Completed orders will be archived here for your records."
          }
        />
      )}
    </div>
  );
}

import Link from "next/link";
function LinkForOrder({ orderId }: { orderId: string }) {
  return (
    <Link
      href={`/seller/orders/${orderId}/messages`}
      className="flex items-center justify-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
      aria-label="Message buyer"
    >
      <MessageSquare size={12} aria-hidden="true" />
      Message
    </Link>
  );
}