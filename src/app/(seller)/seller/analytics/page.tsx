import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StoreIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { RevenueChart } from "./revenue-chart";
import type { Order, OrderItem } from "@/types";

interface AnalyticsData {
  thisMonthOrders: number;
  lastMonthOrders: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  averageOrderValue: number;
  topItems: { name: string; quantity: number; revenue: number }[];
  last7Days: { date: Date; amount: number; label: string }[];
  hasAnyOrders: boolean;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatAbbrevDay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Server-rendered analytics view for sellers.
 *
 * Fetches the seller's orders via the Supabase server client (so RLS still
 * applies) and computes this-month performance metrics + a 7-day revenue
 * series. The chart is split into a client island to keep hover tooltips
 * interactive while keeping the heavy data work on the server.
 */
export default async function SellerAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Confirm seller role and fetch store.
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!store) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16">
        <EmptyState
          icon={StoreIcon}
          title="No store found"
          message="Set up your storefront first to start tracking analytics."
          ctaLabel="Set up store"
          ctaHref="/seller/storefront"
        />
      </div>
    );
  }

  // Pull orders with their line items so we can compute best-sellers.
  const { data: ordersData } = await supabase
    .from("orders")
    .select(
      "id, status, total_price, created_at, items:order_items(quantity, price_at_time, item:food_items(name))"
    )
    .eq("store_id", store.id);

  const orders = (ordersData as unknown as (Order & {
    items: (OrderItem & { item: { name: string } | null })[];
  })[]) || [];

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(
    new Date(now.getFullYear(), now.getMonth() - 1, 1)
  );

  // Revenue only counts orders that the seller actually fulfilled.
  const isRevenue = (o: { status: string }) =>
    o.status === "completed" || o.status === "accepted" || o.status === "ready";

  const thisMonthOrders = orders.filter(
    (o) => new Date(o.created_at) >= thisMonthStart
  );
  const lastMonthOrders = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= lastMonthStart && d < thisMonthStart;
  });

  const thisMonthRevenue = thisMonthOrders
    .filter(isRevenue)
    .reduce((sum, o) => sum + (o.total_price || 0), 0);
  const lastMonthRevenue = lastMonthOrders
    .filter(isRevenue)
    .reduce((sum, o) => sum + (o.total_price || 0), 0);

  const revenueOrderCount = thisMonthOrders.filter(isRevenue).length;
  const averageOrderValue =
    revenueOrderCount > 0 ? thisMonthRevenue / revenueOrderCount : 0;

  // Top 3 best-sellers by quantity (this month).
  const itemTotals = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  for (const order of thisMonthOrders) {
    for (const oi of order.items || []) {
      const name = oi.item?.name ?? "Unknown";
      const key = name.toLowerCase();
      const existing = itemTotals.get(key);
      const qty = oi.quantity || 0;
      const rev = (oi.price_at_time || 0) * qty;
      if (existing) {
        existing.quantity += qty;
        existing.revenue += rev;
      } else {
        itemTotals.set(key, { name, quantity: qty, revenue: rev });
      }
    }
  }
  const topItems = Array.from(itemTotals.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3);

  // 7-day revenue series (oldest -> newest).
  const last7Days: { date: Date; amount: number; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    );
    const next = startOfDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
    );
    const amount = orders
      .filter(
        (o) =>
          isRevenue(o) &&
          new Date(o.created_at) >= day &&
          new Date(o.created_at) < next
      )
      .reduce((sum, o) => sum + (o.total_price || 0), 0);
    last7Days.push({ date: day, amount, label: formatAbbrevDay(day) });
  }

  const analytics: AnalyticsData = {
    thisMonthOrders: thisMonthOrders.length,
    lastMonthOrders: lastMonthOrders.length,
    thisMonthRevenue,
    lastMonthRevenue,
    averageOrderValue,
    topItems,
    last7Days,
    hasAnyOrders: orders.length > 0,
  };

  if (!analytics.hasAnyOrders) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
        <SectionHeader
          title="Analytics"
          subtitle="This month's performance"
          variant="accent-line"
        />
        <EmptyState
          icon={TrendingUp}
          title="No data yet"
          message="Once buyers start placing orders, you'll see performance metrics here."
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      <SectionHeader
        title="Analytics"
        subtitle="This month's performance"
        variant="accent-line"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <MetricCard
          label="Orders this month"
          value={analytics.thisMonthOrders.toString()}
          delta={pctChange(
            analytics.thisMonthOrders,
            analytics.lastMonthOrders
          )}
        />
        <MetricCard
          label="Revenue this month"
          value={`৳${analytics.thisMonthRevenue.toFixed(0)}`}
          delta={pctChange(
            analytics.thisMonthRevenue,
            analytics.lastMonthRevenue
          )}
        />
        <MetricCard
          label="Avg. order value"
          value={`৳${analytics.averageOrderValue.toFixed(0)}`}
        />
      </div>

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 md:p-5 mb-6">
        <SectionHeader title="Last 7 days" subtitle="Daily revenue" />
        <RevenueChart data={analytics.last7Days} />
      </div>

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 md:p-5">
        <SectionHeader
          title="Best-sellers this month"
          subtitle="Top 3 by quantity"
        />
        {analytics.topItems.length > 0 ? (
          <ol role="list" className="space-y-2">
            {analytics.topItems.map((item, idx) => (
              <li
                key={item.name}
                className="flex items-center gap-3 p-3 bg-[var(--background)] rounded-lg"
              >
                <span
                  aria-hidden="true"
                  className="shrink-0 w-7 h-7 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-bold flex items-center justify-center"
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text)] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    ৳{item.revenue.toFixed(0)} revenue
                  </p>
                </div>
                <span className="text-sm font-mono font-bold text-[var(--primary)] shrink-0">
                  {item.quantity}×
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            No items sold this month yet.
          </p>
        )}
      </div>
    </div>
  );
}

function pctChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return null;
    return { value: 100, direction: "up" as const };
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { value: 0, direction: "flat" as const };
  return {
    value: Math.abs(pct),
    direction: pct > 0 ? ("up" as const) : ("down" as const),
  };
}

function MetricCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: { value: number; direction: "up" | "down" | "flat" } | null;
}) {
  const DeltaIcon =
    delta?.direction === "up"
      ? TrendingUp
      : delta?.direction === "down"
        ? TrendingDown
        : Minus;
  const deltaColor =
    delta?.direction === "up"
      ? "text-[var(--success)]"
      : delta?.direction === "down"
        ? "text-[var(--danger)]"
        : "text-[var(--text-subtle)]";
  const deltaText =
    !delta || delta.direction === "flat"
      ? "—"
      : `${delta.direction === "up" ? "+" : "-"}${delta.value.toFixed(0)}% vs last month`;

  return (
    <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-xl font-bold font-mono text-[var(--text)]">{value}</p>
      {delta ? (
        <div
          className={`flex items-center gap-1 mt-1.5 text-xs ${deltaColor}`}
          aria-label={deltaText}
        >
          <DeltaIcon size={12} aria-hidden="true" />
          <span>{deltaText}</span>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-subtle)] mt-1.5">
          No prior data
        </p>
      )}
    </div>
  );
}
