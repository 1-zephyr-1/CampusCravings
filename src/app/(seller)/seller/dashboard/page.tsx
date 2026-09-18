"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Order, Store } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";
import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import {
  ShoppingBag,
  DollarSign,
  UtensilsCrossed,
  Clock,
  Plus,
  Package,
  Store as StoreIcon,
  type LucideIcon,
} from "lucide-react";

interface DashboardStats {
  totalOrders: number;
  revenue: number;
  activeItems: number;
  pendingOrders: number;
}

interface StatCard {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning";
}

const TONE_CLASSES: Record<StatCard["tone"], { text: string; bg: string }> = {
  primary: { text: "text-[var(--primary)]", bg: "bg-[var(--primary-soft)]" },
  success: { text: "text-[var(--success)]", bg: "bg-[var(--success)]/10" },
  warning: { text: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)]" },
};

export default function SellerDashboardPage() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  const [store, setStore] = useState<Store | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    revenue: 0,
    activeItems: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function fetchDashboard() {
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", profile!.id)
        .single();

      if (!storeData) {
        setLoading(false);
        return;
      }

      setStore(storeData);

      const [ordersResult, itemsResult] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "*, customer:profiles!orders_customer_id_fkey(full_name), items:order_items(*, item:food_items(name))"
          )
          .eq("store_id", storeData.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("food_items")
          .select("*", { count: "exact" })
          .eq("store_id", storeData.id)
          .eq("is_sold_out", false),
      ]);

      const orders = ordersResult.data || [];
      const activeItems = itemsResult.count || 0;

      const totalRevenue = orders
        .filter((o: Order) => o.status === "completed")
        .reduce((sum: number, o: Order) => sum + o.total_price, 0);

      const pendingOrders = orders.filter(
        (o: Order) => o.status === "requested"
      ).length;

      setStats({
        totalOrders: orders.length,
        revenue: totalRevenue,
        activeItems,
        pendingOrders,
      });

      setRecentOrders(orders.slice(0, 5));
      setLoading(false);
    }

    fetchDashboard();
  }, [profile, supabase]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16">
        <EmptyState
          icon={StoreIcon}
          title="No store found"
          message="Set up your storefront first so buyers can find you on the feed."
          ctaLabel="Set up store"
          ctaHref="/seller/storefront"
        />
      </div>
    );
  }

  const statCards: StatCard[] = [
    {
      label: "Total orders",
      value: stats.totalOrders,
      icon: ShoppingBag,
      tone: "primary",
    },
    {
      label: "Revenue",
      value: `৳${stats.revenue.toFixed(0)}`,
      icon: DollarSign,
      tone: "success",
    },
    {
      label: "Active items",
      value: stats.activeItems,
      icon: UtensilsCrossed,
      tone: "warning",
    },
    {
      label: "Pending",
      value: stats.pendingOrders,
      icon: Clock,
      tone: "primary",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">{store.name}</p>
        </div>
        <span
          className={clsx(
            "px-3 py-1 rounded-full text-xs font-semibold",
            store.is_open
              ? "bg-[var(--success)]/15 text-[var(--success)]"
              : "bg-[var(--background)] text-[var(--text-muted)]"
          )}
        >
          {store.is_open ? "Open" : "Closed"}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((card) => {
          const tone = TONE_CLASSES[card.tone];
          return (
            <div
              key={card.label}
              className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={clsx("p-1.5 rounded-lg", tone.bg)}>
                  <card.icon size={14} className={tone.text} aria-hidden="true" />
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {card.label}
                </span>
              </div>
              <p className="text-xl font-bold text-[var(--text)] font-mono">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <SectionHeader title="Quick actions" />
          <div className="p-4 pt-0 space-y-1">
            <Link
              href="/seller/new-item"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
            >
              <div className="p-2 rounded-lg bg-[var(--primary-soft)]">
                <Plus size={16} className="text-[var(--primary)]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Create item</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Add a new food listing
                </p>
              </div>
            </Link>
            <Link
              href="/seller/orders"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
            >
              <div className="p-2 rounded-lg bg-[var(--warning-soft)]">
                <Package size={16} className="text-[var(--warning)]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">View orders</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Manage incoming orders
                </p>
              </div>
            </Link>
            <Link
              href="/seller/storefront"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
            >
              <div className="p-2 rounded-lg bg-[var(--success)]/10">
                <StoreIcon size={16} className="text-[var(--success)]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">
                  Edit storefront
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Update your store profile
                </p>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between p-4 pb-2">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Recent orders
            </h2>
            <Link
              href="/seller/orders"
              className="text-xs text-[var(--primary)] font-medium hover:underline"
            >
              View all
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <ul role="list" className="space-y-1 px-4 pb-4">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--background)]"
                >
                  <div className="min-w-0">
                    <span
                      className={clsx(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                        ORDER_STATUSES[order.status]?.color
                      )}
                    >
                      {ORDER_STATUSES[order.status]?.label}
                    </span>
                    <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                      {order.customer?.full_name || "Customer"}
                      {" · "}
                      {order.items?.length || 0} items
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold font-mono text-[var(--primary)]">
                      ৳{order.total_price.toFixed(0)}
                    </p>
                    <p className="text-[10px] text-[var(--text-subtle)]">
                      {format(new Date(order.created_at), "h:mm a")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 pb-4">
              <EmptyState
                icon={Package}
                title="No orders yet"
                message="Once a buyer pre-orders from your store, you'll see it here."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}