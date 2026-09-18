"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import {
  Store,
  ShoppingCart,
  UtensilsCrossed,
  Users,
  Clock,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Order } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { WeeklyBarChart } from "@/components/ui/weekly-bar-chart";
import { clsx } from "clsx";

interface Stats {
  totalSellers: number;
  totalOrders: number;
  totalItems: number;
  totalUsers: number;
}

interface PopularItem {
  name: string;
  store_name: string;
  order_count: number;
}

interface StatCard {
  label: string;
  value: number;
  icon: typeof Store;
  tone: "primary" | "warning" | "success" | "neutral";
}

interface WeeklyCounts {
  thisWeek: number[];
  lastWeek: number[];
}

const EMPTY_WEEK: number[] = [0, 0, 0, 0, 0, 0, 0];

const TONE_CLASSES: Record<StatCard["tone"], { text: string; bg: string }> = {
  primary: { text: "text-[var(--primary)]", bg: "bg-[var(--primary-soft)]" },
  warning: { text: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)]" },
  success: { text: "text-[var(--success)]", bg: "bg-[var(--success)]/10" },
  neutral: { text: "text-[var(--text-muted)]", bg: "bg-[var(--background)]" },
};

/**
 * Count how many rows were created each day of the given 0-indexed week
 * (Monday-Sunday). Returns a 7-length array aligned to `DAY_OFFSETS`.
 */
function countByDay(
  rows: { created_at: string }[] | null | undefined,
  refMonday: Date,
): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  if (!rows) return out;
  const refMs = refMonday.getTime();
  for (const row of rows) {
    const t = new Date(row.created_at).getTime();
    const diffDays = Math.floor((t - refMs) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays < 7) out[diffDays] += 1;
  }
  return out;
}

/** Returns Monday 00:00 local time for the week containing `date`. */
function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0=Mon..6=Sun
  d.setDate(d.getDate() - day);
  return d;
}

export default function CreatorDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalSellers: 0,
    totalOrders: 0,
    totalItems: 0,
    totalUsers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [charts, setCharts] = useState<{
    users: WeeklyCounts;
    orders: WeeklyCounts;
    listings: WeeklyCounts;
  }>({
    users: { thisWeek: EMPTY_WEEK, lastWeek: EMPTY_WEEK },
    orders: { thisWeek: EMPTY_WEEK, lastWeek: EMPTY_WEEK },
    listings: { thisWeek: EMPTY_WEEK, lastWeek: EMPTY_WEEK },
  });
  const supabase = useSupabase();

  useEffect(() => {
    async function fetchDashboard() {
      const [sellers, orders, items, users] = await Promise.all([
        supabase
          .from("stores")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("food_items")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalSellers: sellers.count || 0,
        totalOrders: orders.count || 0,
        totalItems: items.count || 0,
        totalUsers: users.count || 0,
      });

      const { data: recentData } = await supabase
        .from("orders")
        .select("*, customer:profiles!orders_customer_id_fkey(full_name, email), store:stores(name)")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentOrders(recentData || []);

      const { data: ordersWithItems } = await supabase
        .from("order_items")
        .select("item_id, quantity, item:food_items(name, store:stores(name))");

      const itemCounts: Record<string, { name: string; store_name: string; count: number }> = {};
      if (ordersWithItems) {
        for (const oi of ordersWithItems) {
          const key = oi.item_id;
          const item = oi.item as { name?: string; store?: { name?: string } | { name?: string }[] } | null;
          if (!itemCounts[key] && item) {
            const storeArr = item.store;
            itemCounts[key] = {
              name: item.name || "",
              store_name: Array.isArray(storeArr) ? (storeArr as { name?: string }[])[0]?.name || "" : (storeArr as { name?: string })?.name || "",
              count: 0,
            };
          }
          if (itemCounts[key]) {
            itemCounts[key].count += oi.quantity;
          }
        }
      }

      const sorted = Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setPopularItems(sorted.map((i) => ({
        name: i.name,
        store_name: i.store_name,
        order_count: i.count,
      })));

      // Weekly chart data: pull the last 14 days from each table and bucket
      // by day. 14-day window = this week + last week.
      const since = new Date();
      since.setDate(since.getDate() - 14);

      const [{ data: usersRows }, { data: ordersRows }, { data: listingsRows }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("created_at")
            .gte("created_at", since.toISOString()),
          supabase
            .from("orders")
            .select("created_at")
            .gte("created_at", since.toISOString()),
          supabase
            .from("food_items")
            .select("created_at")
            .gte("created_at", since.toISOString()),
        ]);

      const thisMonday = mondayOf(new Date());
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);

      setCharts({
        users: {
          thisWeek: countByDay(usersRows, thisMonday),
          lastWeek: countByDay(
            usersRows?.filter(
              (r) => new Date(r.created_at) >= lastMonday
            ),
            lastMonday,
          ),
        },
        orders: {
          thisWeek: countByDay(ordersRows, thisMonday),
          lastWeek: countByDay(
            ordersRows?.filter(
              (r) => new Date(r.created_at) >= lastMonday
            ),
            lastMonday,
          ),
        },
        listings: {
          thisWeek: countByDay(listingsRows, thisMonday),
          lastWeek: countByDay(
            listingsRows?.filter(
              (r) => new Date(r.created_at) >= lastMonday
            ),
            lastMonday,
          ),
        },
      });

      setLoading(false);
    }

    fetchDashboard();
  }, [supabase]);

  const statCards: StatCard[] = [
    { label: "Total Sellers", value: stats.totalSellers, icon: Store, tone: "primary" },
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, tone: "warning" },
    { label: "Total Items", value: stats.totalItems, icon: UtensilsCrossed, tone: "success" },
    { label: "Total Users", value: stats.totalUsers, icon: Users, tone: "neutral" },
  ];

  const totalUsersThis = charts.users.thisWeek.reduce((s, n) => s + n, 0);

  if (loading) {
    return (
      <div className="space-y-6" aria-label="Loading dashboard" role="status">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text)]">
        Dashboard
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const tone = TONE_CLASSES[card.tone];
          return (
            <div
              key={card.label}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={clsx("p-1.5 rounded-lg", tone.bg)}>
                  <card.icon size={16} className={tone.text} aria-hidden="true" />
                </div>
                <span className="text-sm text-[var(--text-muted)]">
                  {card.label}
                </span>
              </div>
              <p className="text-3xl font-bold text-[var(--text)] font-mono">
                {card.value.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Weekly activity charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <ChartCard
          icon={Users}
          label="New users this week"
          total={totalUsersThis}
          data={charts.users}
        />
        <ChartCard
          icon={ShoppingCart}
          label="New orders this week"
          total={charts.orders.thisWeek.reduce((s, n) => s + n, 0)}
          data={charts.orders}
        />
        <ChartCard
          icon={UtensilsCrossed}
          label="New listings this week"
          total={charts.listings.thisWeek.reduce((s, n) => s + n, 0)}
          data={charts.listings}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <div className="p-5 pb-3 flex items-center gap-2">
            <Clock size={18} className="text-[var(--text-muted)]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Recent Activity
            </h2>
          </div>
          <div className="px-5 pb-5 space-y-1">
            {recentOrders.length === 0 ? (
              <EmptyState
                icon={Clock}
                message="No recent orders to show yet."
                className="rounded-none border-0 py-8"
              />
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)]/50 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">
                      {order.customer?.full_name || order.customer?.email || "Customer"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {(order.store as { name?: string })?.name || "Store"} · ৳{order.total_price}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap ml-3">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <div className="p-5 pb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-[var(--text-muted)]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Most Popular Items
            </h2>
          </div>
          <div className="px-5 pb-5 space-y-1">
            {popularItems.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                message="Popular items appear once orders are placed."
                className="rounded-none border-0 py-8"
              />
            ) : (
              popularItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)]/50 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {item.store_name}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--primary)] whitespace-nowrap ml-3">
                    {item.order_count} orders
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChartCardProps {
  icon: typeof BarChart3;
  label: string;
  total: number;
  data: WeeklyCounts;
}

function ChartCard({ icon: Icon, label, total, data }: ChartCardProps) {
  const hasData =
    total > 0 ||
    data.lastWeek.reduce((s, n) => s + n, 0) > 0;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[var(--text-muted)]" aria-hidden="true" />
          <h2 className="text-sm font-medium text-[var(--text-muted)]">
            {label}
          </h2>
        </div>
        <span className="text-2xl font-bold text-[var(--text)] font-mono">
          {total.toLocaleString()}
        </span>
      </div>
      {hasData ? (
        <WeeklyBarChart
          thisWeek={data.thisWeek}
          lastWeek={data.lastWeek}
          label={`${label}: ${total} this week vs ${data.lastWeek.reduce(
            (s, n) => s + n,
            0,
          )} last week.`}
        />
      ) : (
        <EmptyState
          icon={BarChart3}
          message="No data for this week yet."
          className="border-0 py-8"
        />
      )}
    </div>
  );
}