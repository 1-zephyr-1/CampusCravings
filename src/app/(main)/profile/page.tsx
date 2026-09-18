"use client";

import { Suspense, useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useTheme } from "next-themes";
import { useRouter, useSearchParams } from "next/navigation";
import { Notification, Store } from "@/types";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import {
  User,
  Mail,
  Store as StoreIcon,
  BarChart3,
  Settings,
  Bell,
  Heart,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  ShoppingBag,
  Package,
  CheckCircle2,
  Circle,
  Edit,
} from "lucide-react";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-4"><div className="animate-pulse space-y-4"><div className="h-32 bg-gray-100 dark:bg-gray-700/30 rounded-xl" /></div></div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const { profile, loading } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();

  const activeTab = searchParams.get("tab") || "overview";

  const [store, setStore] = useState<Store | null>(null);
  const [stats, setStats] = useState({ orders: 0, itemsSold: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    async function fetchData() {
      if (profile!.role === "seller") {
        const { data: storeData } = await supabase
          .from("stores")
          .select("*")
          .eq("user_id", profile!.id)
          .single();
        setStore(storeData);

        if (storeData) {
          const { count: orderCount } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("store_id", storeData.id);

          const { count: itemCount } = await supabase
            .from("order_items")
            .select("*, order:orders!order_items_order_id_fkey(store_id)", {
              count: "exact",
              head: true,
            })
            .eq("order.store_id", storeData.id);

          setStats({ orders: orderCount || 0, itemsSold: itemCount || 0 });
        }
      }

      if (profile!.role === "customer") {
        const { count: orderCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("customer_id", profile!.id);

        setStats({ orders: orderCount || 0, itemsSold: 0 });
      }

      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setNotifications(notifs || []);
      setUnreadCount((notifs || []).filter((n) => !n.is_read).length);
    }

    fetchData();
  }, [profile]);

  async function handleMarkAllRead() {
    if (!profile) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", profile.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-gray-100 dark:bg-gray-700/30 rounded-lg animate-pulse" />
          <div className="h-40 bg-gray-100 dark:bg-gray-700/30 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { id: "favorites", label: "Favorites", icon: Heart },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Profile
      </h1>

      <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/profile?tab=${tab.id}`}
            className={clsx(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "bg-red-600 text-white"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.badge ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  width={96}
                  height={96}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-tomato to-turmeric flex items-center justify-center text-white text-xl font-bold">
                  {getInitials(profile.full_name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {profile.full_name}
                </h2>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Mail size={13} />
                  {profile.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={clsx(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize",
                      profile.role === "seller"
                        ? "bg-amber-500/20 text-amber-700"
                        : profile.role === "creator"
                        ? "bg-red-600/20 text-red-600"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {profile.role}
                  </span>
                </div>
              </div>
              <Link
                href="/profile/edit"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-red-600/30 hover:text-red-600 transition-colors dark:border-gray-700"
              >
                <Edit size={12} />
                Edit
              </Link>
            </div>
          </div>

          {profile.role === "seller" && store && (
            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <StoreIcon size={14} />
                Seller Links
              </h3>
              <div className="space-y-2">
                <Link
                  href={`/feed/${store.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <StoreIcon size={16} className="text-amber-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      My Store
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-500" />
                </Link>
                <Link
                  href="/seller/dashboard"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-600/10">
                      <BarChart3 size={16} className="text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Seller Dashboard
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-500" />
                </Link>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-red-600/10">
                  <ShoppingBag size={14} className="text-red-600" />
                </div>
                <span className="text-xs text-gray-500">Total Orders</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                {stats.orders}
              </p>
            </div>
            {profile.role === "seller" && (
              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Package size={14} className="text-amber-500" />
                  </div>
                  <span className="text-xs text-gray-500">Items Sold</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                  {stats.itemsSold}
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Settings size={14} />
              Settings
            </h3>
            <div className="space-y-2">
              <Link
                href="/profile/edit"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-bark/10">
                    <User size={16} className="text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    Edit Name & Photo
                  </span>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </Link>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    {theme === "dark" ? (
                      <Sun size={16} className="text-amber-500" />
                    ) : (
                      <Moon size={16} className="text-amber-500" />
                    )}
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </span>
                </div>
                <div
                  className={clsx(
                    "w-9 h-5 rounded-full transition-colors relative",
                    theme === "dark" ? "bg-red-600" : "bg-bark/30"
                  )}
                >
                  <div
                    className={clsx(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                      theme === "dark" ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </div>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-600/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-600/10">
                    <LogOut size={16} className="text-red-600" />
                  </div>
                  <span className="text-sm text-red-600 font-medium">
                    Sign Out
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-2">
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-red-600 font-medium hover:underline mb-2"
            >
              Mark all as read
            </button>
          )}
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={clsx(
                  "p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 transition-colors",
                  notif.is_read
                    ? "border-gray-200"
                    : "border-amber-500/30 bg-amber-500/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {notif.is_read ? (
                      <CheckCircle2
                        size={16}
                        className="text-gray-300"
                      />
                    ) : (
                      <Circle
                        size={16}
                        className="text-amber-500 fill-turmeric/20"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {format(new Date(notif.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  {notif.link && (
                    <Link
                      href={notif.link}
                      className="text-xs text-red-600 font-medium shrink-0"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <Bell size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No notifications yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "favorites" && (
        <div className="text-center py-16">
          <Heart size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 mb-3">
            View your saved items and stores
          </p>
          <Link
            href="/profile/favorites"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            <Heart size={16} />
            View Favorites
          </Link>
        </div>
      )}
    </div>
  );
}
