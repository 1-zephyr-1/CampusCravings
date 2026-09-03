"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { Order, FoodItem, Store } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";
import { clsx } from "clsx";
import {
  ShoppingBag,
  DollarSign,
  UtensilsCrossed,
  Clock,
  Plus,
  Package,
  Store as StoreIcon,
} from "lucide-react";

interface DashboardStats {
  totalOrders: number;
  revenue: number;
  activeItems: number;
  pendingOrders: number;
}

export default function SellerDashboardPage() {
  const { profile } = useAuth();
  const supabase = createClient();
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
          .select("*, customer:profiles!orders_customer_id_fkey(full_name), items:order_items(*, item:food_items(name))")
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
  }, [profile]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-sand/30 dark:bg-[#3A2E20] rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-sand/30 dark:bg-[#3A2E20] rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 text-center">
        <StoreIcon size={48} className="mx-auto mb-4 text-bark/30" />
        <h2 className="text-lg font-bold text-espresso dark:text-cream mb-2">
          No Store Found
        </h2>
        <p className="text-sm text-bark mb-4">
          You need to set up your store first.
        </p>
        <Link
          href="/seller/storefront"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-tomato text-white rounded-full text-sm font-semibold hover:bg-tomato-hover transition-colors"
        >
          <StoreIcon size={16} />
          Set Up Store
        </Link>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: "text-tomato",
      bg: "bg-tomato/10",
    },
    {
      label: "Revenue",
      value: `৳${stats.revenue.toFixed(0)}`,
      icon: DollarSign,
      color: "text-herb",
      bg: "bg-herb/10",
    },
    {
      label: "Active Items",
      value: stats.activeItems,
      icon: UtensilsCrossed,
      color: "text-turmeric",
      bg: "bg-turmeric/10",
    },
    {
      label: "Pending",
      value: stats.pendingOrders,
      icon: Clock,
      color: "text-chili",
      bg: "bg-chili/10",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-espresso dark:text-cream">
            Dashboard
          </h1>
          <p className="text-sm text-bark">{store.name}</p>
        </div>
        <span
          className={clsx(
            "px-3 py-1 rounded-full text-xs font-semibold",
            store.is_open
              ? "bg-herb/20 text-herb"
              : "bg-bark/20 text-bark"
          )}
        >
          {store.is_open ? "Open" : "Closed"}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={clsx("p-1.5 rounded-lg", card.bg)}>
                <card.icon size={14} className={card.color} />
              </div>
              <span className="text-xs text-bark">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-espresso dark:text-cream font-mono">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]">
          <h2 className="text-sm font-semibold text-espresso dark:text-cream mb-3">
            Quick Actions
          </h2>
          <div className="space-y-2">
            <Link
              href="/seller/new-item"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand/50 dark:hover:bg-[#3A2E20] transition-colors"
            >
              <div className="p-2 rounded-lg bg-tomato/10">
                <Plus size={16} className="text-tomato" />
              </div>
              <div>
                <p className="text-sm font-medium text-espresso dark:text-cream">
                  Create Item
                </p>
                <p className="text-xs text-bark">Add a new food listing</p>
              </div>
            </Link>
            <Link
              href="/seller/orders"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand/50 dark:hover:bg-[#3A2E20] transition-colors"
            >
              <div className="p-2 rounded-lg bg-turmeric/10">
                <Package size={16} className="text-turmeric" />
              </div>
              <div>
                <p className="text-sm font-medium text-espresso dark:text-cream">
                  View Orders
                </p>
                <p className="text-xs text-bark">Manage incoming orders</p>
              </div>
            </Link>
            <Link
              href="/seller/storefront"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand/50 dark:hover:bg-[#3A2E20] transition-colors"
            >
              <div className="p-2 rounded-lg bg-herb/10">
                <StoreIcon size={16} className="text-herb" />
              </div>
              <div>
                <p className="text-sm font-medium text-espresso dark:text-cream">
                  Edit Storefront
                </p>
                <p className="text-xs text-bark">Update your store profile</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-espresso dark:text-cream">
              Recent Orders
            </h2>
            <Link
              href="/seller/orders"
              className="text-xs text-tomato font-medium hover:underline"
            >
              View all
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-cream dark:bg-cream-dark"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                          ORDER_STATUSES[order.status]?.color
                        )}
                      >
                        {ORDER_STATUSES[order.status]?.label}
                      </span>
                    </div>
                    <p className="text-xs text-bark mt-0.5 truncate">
                      {order.customer?.full_name || "Customer"}
                      {" · "}
                      {order.items?.length || 0} items
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold font-mono text-tomato">
                      ৳{order.total_price.toFixed(0)}
                    </p>
                    <p className="text-[10px] text-bark/50">
                      {format(new Date(order.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package size={24} className="mx-auto mb-2 text-bark/30" />
              <p className="text-xs text-bark">No orders yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
