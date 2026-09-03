"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Store,
  ShoppingCart,
  UtensilsCrossed,
  Users,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Order } from "@/types";

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
  const supabase = createClient();

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
          const item = oi.item as any;
          if (!itemCounts[key] && item) {
            const storeArr = item.store;
            itemCounts[key] = {
              name: item.name,
              store_name: Array.isArray(storeArr) ? storeArr[0]?.name || "" : storeArr?.name || "",
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

      setLoading(false);
    }

    fetchDashboard();
  }, []);

  const statCards = [
    { label: "Total Sellers", value: stats.totalSellers, icon: Store, color: "text-tomato" },
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-turmeric" },
    { label: "Total Items", value: stats.totalItems, icon: UtensilsCrossed, color: "text-herb" },
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-bark" },
  ];

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
        Dashboard
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <card.icon size={20} className={card.color} strokeWidth={1.75} />
              <span className="text-sm text-bark dark:text-cream/60">
                {card.label}
              </span>
            </div>
            <p className="text-3xl font-bold text-espresso dark:text-cream">
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-bark" />
            <h2 className="text-lg font-semibold text-espresso dark:text-cream">
              Recent Activity
            </h2>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-bark dark:text-cream/50 py-4 text-center">
                No recent orders
              </p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-sand/50 dark:border-[#4A3D30]/50 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-espresso dark:text-cream truncate">
                      {order.customer?.full_name || order.customer?.email || "Customer"}
                    </p>
                    <p className="text-xs text-bark dark:text-cream/50">
                      {(order.store as any)?.name || "Store"} · ৳{order.total_price}
                    </p>
                  </div>
                  <span className="text-xs text-bark dark:text-cream/50 whitespace-nowrap ml-3">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-bark" />
            <h2 className="text-lg font-semibold text-espresso dark:text-cream">
              Most Popular Items
            </h2>
          </div>
          <div className="space-y-3">
            {popularItems.length === 0 ? (
              <p className="text-sm text-bark dark:text-cream/50 py-4 text-center">
                No data yet
              </p>
            ) : (
              popularItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-sand/50 dark:border-[#4A3D30]/50 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-espresso dark:text-cream truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-bark dark:text-cream/50">
                      {item.store_name}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-tomato whitespace-nowrap ml-3">
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
