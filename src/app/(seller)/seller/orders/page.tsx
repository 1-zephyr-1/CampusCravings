"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";

import Link from "next/link";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Order, OrderStatus, Store } from "@/types";
import { ORDER_STATUSES, MAX_PENDING_ORDERS } from "@/lib/constants";

import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { toast } from "@/components/ui/toast";
import {
  Check,
  X,
  ChefHat,
  PackageCheck,
  Clock,
  MessageSquare,
  RefreshCw,
  Square,
  CheckSquare,
} from "lucide-react";

type StatusFilter = "all" | OrderStatus;

// Display order for the filter chips. Matches the natural flow sellers expect.
const FILTER_ORDER: StatusFilter[] = [
  "all",
  "requested",
  "accepted",
  "ready",
  "completed",
  "declined",
  "cancelled",
];

export default function SellerOrdersPage() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  // Selected order ids for bulk actions.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
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

  // Counts per status for the filter chips. "All" is the total.
  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: orders.length,
      requested: 0,
      accepted: 0,
      ready: 0,
      completed: 0,
      declined: 0,
      cancelled: 0,
    };
    for (const o of orders) {
      c[o.status as OrderStatus] = (c[o.status as OrderStatus] ?? 0) + 1;
    }
    return c;
  }, [orders]);

  const displayOrders = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  function getAnonymizedName(order: Order) {
    if (!order.customer?.full_name) return "Student";
    const parts = order.customer.full_name.split(" ");
    if (parts.length <= 1) return parts[0][0] + "***";
    return parts[0] + " " + parts[parts.length - 1][0] + ".";
  }

  // Bulk selection helpers — only enabled for orders that can be marked ready
  // (i.e. status === "accepted"). Other statuses can't be bulk-transitioned.
  const bulkEligible = useMemo(
    () => displayOrders.filter((o) => o.status === "accepted"),
    [displayOrders]
  );
  const bulkEligibleIds = useMemo(
    () => new Set(bulkEligible.map((o) => o.id)),
    [bulkEligible]
  );

  function toggleSelect(orderId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const allSelected =
        bulkEligible.length > 0 &&
        bulkEligible.every((o) => prev.has(o.id));
      if (allSelected) return new Set();
      return new Set(bulkEligible.map((o) => o.id));
    });
  }

  // Reset stale selections when the filter changes so we never apply a bulk
  // action to rows that aren't on screen.
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) if (bulkEligibleIds.has(id)) next.add(id);
      return next;
    });
  }, [bulkEligibleIds]);

  async function handleBulkMarkReady() {
    const ids = Array.from(selected).filter((id) => bulkEligibleIds.has(id));
    if (ids.length === 0) return;
    setBulkUpdating(true);
    // Single round-trip: update all eligible rows to "ready" in one query.
    const { error } = await supabase
      .from("orders")
      .update({ status: "ready" })
      .in("id", ids);
    setBulkUpdating(false);

    if (error) {
      toast("Couldn't update those orders. Try again.", "error");
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (ids.includes(o.id) ? { ...o, status: "ready" } : o))
    );
    setSelected(new Set());
    toast(
      `${ids.length} order${ids.length === 1 ? "" : "s"} marked ready`,
      "success"
    );
  }

  const filterLabel: Record<StatusFilter, string> = {
    all: "All",
    requested: "Pending",
    accepted: "Accepted",
    ready: "Ready",
    completed: "Completed",
    declined: "Declined",
    cancelled: "Cancelled",
  };

  const allOnScreenSelected =
    bulkEligible.length > 0 &&
    bulkEligible.every((o) => selected.has(o.id));

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

      {counts.requested >= MAX_PENDING_ORDERS && (
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

      {/* Filter chips. Counts come from the live order list. */}
      <div
        role="toolbar"
        aria-label="Filter by status"
        className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-4 px-4 md:mx-0 md:px-0"
      >
        {FILTER_ORDER.map((key) => {
          const isActive = filter === key;
          return (
            <FilterChip
              key={key}
              label={`${filterLabel[key]} (${counts[key]})`}
              isActive={isActive}
              mode="single"
              onClick={() => setFilter(key)}
            />
          );
        })}
      </div>

      {/* Bulk action bar — appears when ≥1 order is selected. */}
      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="mb-3 p-2.5 bg-[var(--primary-soft)] border border-[var(--primary)]/30 rounded-xl flex items-center justify-between gap-2 animate-fade-in motion-reduce:animate-none"
        >
          <p className="text-xs font-medium text-[var(--primary)]">
            {selected.size} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface)] transition-colors motion-reduce:transition-none"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkMarkReady}
              disabled={bulkUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--warning)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--warning)]/90 transition-colors motion-reduce:transition-none disabled:opacity-50"
            >
              <ChefHat size={12} aria-hidden="true" />
              {bulkUpdating ? "Updating…" : "Mark as ready"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Loading orders" role="status">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : displayOrders.length > 0 ? (
        <>
          {/* Select-all header — only when there are bulk-eligible rows on
              screen. Clicking toggles selection across the visible list. */}
          {bulkEligible.length > 0 && (
            <div className="mb-2 flex items-center justify-end">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
                aria-pressed={allOnScreenSelected}
              >
                {allOnScreenSelected ? (
                  <CheckSquare size={12} aria-hidden="true" />
                ) : (
                  <Square size={12} aria-hidden="true" />
                )}
                {allOnScreenSelected ? "Deselect all" : "Select all ready-to-mark"}
              </button>
            </div>
          )}
          <ul role="list" className="space-y-3">
            {displayOrders.map((order) => {
              const isBulkEligible = bulkEligibleIds.has(order.id);
              const isSelected = selected.has(order.id);
              return (
                <li
                  key={order.id}
                  className={clsx(
                    "p-4 bg-[var(--surface)] rounded-xl border transition-colors motion-reduce:transition-none",
                    isSelected
                      ? "border-[var(--primary)]/50"
                      : "border-[var(--border)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2 min-w-0">
                      {isBulkEligible && (
                        <button
                          type="button"
                          onClick={() => toggleSelect(order.id)}
                          aria-label={
                            isSelected
                              ? `Deselect order ${order.id.slice(0, 8)}`
                              : `Select order ${order.id.slice(0, 8)}`
                          }
                          aria-pressed={isSelected}
                          className="mt-0.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
                        >
                          {isSelected ? (
                            <CheckSquare
                              size={16}
                              className="text-[var(--primary)]"
                              aria-hidden="true"
                            />
                          ) : (
                            <Square size={16} aria-hidden="true" />
                          )}
                        </button>
                      )}
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
                            counts.requested >= MAX_PENDING_ORDERS
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
              );
            })}
          </ul>
        </>
      ) : (
        <EmptyState
          icon={RefreshCw}
          title={
            filter === "all"
              ? "No orders yet"
              : `No ${filterLabel[filter].toLowerCase()} orders`
          }
          message={
            filter === "all"
              ? "New pre-orders from buyers will appear here."
              : filter === "requested"
                ? "New pre-orders from buyers will appear here."
                : filter === "accepted" || filter === "ready"
                  ? "Once you accept an order, it'll show up here."
                  : "Completed orders will be archived here for your records."
          }
        />
      )}
    </div>
  );
}

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
