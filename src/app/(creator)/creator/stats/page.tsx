"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingCart,
} from "lucide-react";

interface DailyOrders {
  date: string;
  count: number;
  revenue: number;
}

interface TopSeller {
  name: string;
  revenue: number;
  orders: number;
}

interface CategoryBreakdown {
  name: string;
  item_count: number;
  order_count: number;
}

interface MonthlyGrowth {
  month: string;
  count: number;
}

export default function StatsPage() {
  const [dailyOrders, setDailyOrders] = useState<DailyOrders[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [userGrowth, setUserGrowth] = useState<MonthlyGrowth[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: orders } = await supabase
      .from("orders")
      .select("created_at, total_price")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at");

    const dailyMap: Record<string, { count: number; revenue: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = { count: 0, revenue: 0 };
    }

    if (orders) {
      for (const order of orders) {
        const key = order.created_at.split("T")[0];
        if (dailyMap[key]) {
          dailyMap[key].count += 1;
          dailyMap[key].revenue += order.total_price;
        }
      }
    }

    setDailyOrders(
      Object.entries(dailyMap).map(([date, data]) => ({ date, ...data }))
    );

    const { data: storeOrders } = await supabase
      .from("orders")
      .select("store_id, total_price, store:stores(name)")
      .eq("status", "completed");

    const sellerMap: Record<string, { name: string; revenue: number; orders: number }> = {};
    if (storeOrders) {
      for (const o of storeOrders) {
        const id = o.store_id;
        if (!sellerMap[id]) {
          sellerMap[id] = {
            name: (o.store as any)?.name || "Unknown",
            revenue: 0,
            orders: 0,
          };
        }
        sellerMap[id].revenue += o.total_price;
        sellerMap[id].orders += 1;
      }
    }

    setTopSellers(
      Object.values(sellerMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
    );

    const { data: catData } = await supabase
      .from("categories")
      .select("name, item_categories(item_id, food_items!inner(id))");

    const catBreakdown: Record<string, { name: string; item_count: number; order_count: number }> = {};
    if (catData) {
      for (const cat of catData) {
        catBreakdown[cat.name] = {
          name: cat.name,
          item_count: cat.item_categories?.length || 0,
          order_count: 0,
        };
      }
    }

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("item_id, item:food_items!inner(id, item_categories(category_id))");

    if (orderItems) {
      for (const oi of orderItems) {
        const cats = (oi.item as any)?.item_categories || [];
        for (const ic of cats) {
          const catEntry = Object.values(catBreakdown).find((c) => c.name);
          if (catEntry) catEntry.order_count += 1;
        }
      }
    }

    setCategoryBreakdown(Object.values(catBreakdown).sort((a, b) => b.order_count - a.order_count));

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: newUsers } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at");

    const monthMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthMap[key] = 0;
    }

    if (newUsers) {
      for (const u of newUsers) {
        const d = new Date(u.created_at);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (key in monthMap) monthMap[key] += 1;
      }
    }

    setUserGrowth(
      Object.entries(monthMap).map(([month, count]) => ({ month, count }))
    );

    setLoading(false);
  }

  const maxDailyRevenue = Math.max(...dailyOrders.map((d) => d.revenue), 1);
  const maxUserGrowth = Math.max(...userGrowth.map((u) => u.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-3 border-tomato border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-espresso dark:text-cream">
        Detailed Stats
      </h1>

      <div className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-bark" />
          <h2 className="text-lg font-semibold text-espresso dark:text-cream">
            Orders — Last 7 Days
          </h2>
        </div>
        <div className="flex items-end gap-2 h-40">
          {dailyOrders.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-bark dark:text-cream/50">
                {day.count}
              </span>
              <div
                className="w-full bg-tomato/20 rounded-t-md min-h-[4px]"
                style={{
                  height: `${(day.revenue / maxDailyRevenue) * 100}%`,
                }}
              />
              <span className="text-[10px] text-bark dark:text-cream/50">
                {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-bark dark:text-cream/50">
          <span>
            Total: {dailyOrders.reduce((s, d) => s + d.count, 0)} orders
          </span>
          <span>
            Revenue: ৳{dailyOrders.reduce((s, d) => s + d.revenue, 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-bark" />
            <h2 className="text-lg font-semibold text-espresso dark:text-cream">
              Top Sellers by Revenue
            </h2>
          </div>
          <div className="space-y-3">
            {topSellers.length === 0 ? (
              <p className="text-sm text-bark dark:text-cream/50 py-4 text-center">
                No completed orders yet
              </p>
            ) : (
              topSellers.map((seller, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-tomato w-5">
                    {i + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-espresso dark:text-cream truncate">
                      {seller.name}
                    </p>
                    <p className="text-xs text-bark dark:text-cream/50">
                      {seller.orders} orders
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-espresso dark:text-cream">
                    ৳{seller.revenue.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={18} className="text-bark" />
            <h2 className="text-lg font-semibold text-espresso dark:text-cream">
              Category Breakdown
            </h2>
          </div>
          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-bark dark:text-cream/50 py-4 text-center">
                No categories found
              </p>
            ) : (
              categoryBreakdown.slice(0, 5).map((cat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-espresso dark:text-cream">
                      {cat.name}
                    </p>
                    <p className="text-xs text-bark dark:text-cream/50">
                      {cat.item_count} items
                    </p>
                  </div>
                  <span className="text-sm text-bark dark:text-cream/70">
                    {cat.order_count} orders
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-bark" />
          <h2 className="text-lg font-semibold text-espresso dark:text-cream">
            User Growth
          </h2>
        </div>
        <div className="flex items-end gap-3 h-36">
          {userGrowth.map((month) => (
            <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-bark dark:text-cream/50">
                {month.count}
              </span>
              <div
                className="w-full bg-herb/20 rounded-t-md min-h-[4px]"
                style={{
                  height: `${(month.count / maxUserGrowth) * 100}%`,
                }}
              />
              <span className="text-[10px] text-bark dark:text-cream/50">
                {month.month}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-bark dark:text-cream/50">
          Total new users (6 months):{" "}
          {userGrowth.reduce((s, m) => s + m.count, 0)}
        </div>
      </div>
    </div>
  );
}
