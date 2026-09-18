"use client";

import { Suspense, useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useTheme } from "next-themes";
import { useRouter, useSearchParams } from "next/navigation";
import { Notification, Store } from "@/types";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  Star,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

type ActivityKind = "order" | "message" | "favorite" | "review";

interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  icon: LucideIcon;
  iconClass: string;
  iconBgClass: string;
  label: string;
  createdAt: string;
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
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
  const [stats, setStats] = useState({
    orders: 0,
    itemsSold: 0,
    totalSpent: 0,
    avgRating: 0,
  });
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
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

          setStats((s) => ({
            ...s,
            orders: orderCount || 0,
            itemsSold: itemCount || 0,
          }));
        }
      }

      if (profile!.role === "customer") {
        const { count: orderCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("customer_id", profile!.id);

        const { data: completedRows } = await supabase
          .from("orders")
          .select("total_price")
          .eq("customer_id", profile!.id)
          .eq("status", "completed");

        const totalSpent = (completedRows || []).reduce(
          (sum, row) => sum + (row.total_price || 0),
          0
        );

        const { data: reviewRows } = await supabase
          .from("reviews")
          .select("rating")
          .eq("user_id", profile!.id);

        const avgRating =
          reviewRows && reviewRows.length > 0
            ? reviewRows.reduce((sum, r) => sum + r.rating, 0) /
              reviewRows.length
            : 0;

        setStats((s) => ({
          ...s,
          orders: orderCount || 0,
          itemsSold: 0,
          totalSpent,
          avgRating,
        }));
      }

      // Activity timeline: fetch last 10 across multiple tables.
      const userId = profile!.id;
      const [ordersRes, messagesRes, favoritesRes, reviewsRes] =
        await Promise.all([
          supabase
            .from("orders")
            .select("id, created_at, store:stores!orders_store_id_fkey(name)")
            .eq("customer_id", userId)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("messages")
            .select("id, created_at")
            .eq("sender_id", userId)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("favorites")
            .select("created_at, item:food_items!favorites_item_id_fkey(name), store:stores!favorites_store_id_fkey(name)")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("reviews")
            .select("id, created_at, store:stores!reviews_store_id_fkey(name)")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

      const combined: ActivityEntry[] = [];

      (ordersRes.data || []).forEach((o) => {
        const storeName = (o as { store?: { name?: string } }).store?.name;
        combined.push({
          id: `order-${o.id}`,
          kind: "order",
          icon: ShoppingBag,
          iconClass: "text-[var(--primary)]",
          iconBgClass: "bg-[var(--primary-soft)]",
          label: storeName
            ? `Placed an order at ${storeName}`
            : "Placed an order",
          createdAt: o.created_at,
        });
      });

      (messagesRes.data || []).forEach((m) => {
        combined.push({
          id: `message-${m.id}`,
          kind: "message",
          icon: MessageSquare,
          iconClass: "text-[var(--accent)]",
          iconBgClass: "bg-[var(--accent-soft,var(--primary-soft))]",
          label: "Sent a message",
          createdAt: m.created_at,
        });
      });

      (favoritesRes.data || []).forEach((f) => {
        const fav = f as {
          created_at: string;
          item?: { name?: string } | null;
          store?: { name?: string } | null;
        };
        const target = fav.item?.name
          ? fav.item.name
          : fav.store?.name
            ? fav.store.name
            : null;
        combined.push({
          id: `fav-${f.created_at}-${target ?? "x"}`,
          kind: "favorite",
          icon: Heart,
          iconClass: "text-[var(--primary)]",
          iconBgClass: "bg-[var(--primary-soft)]",
          label: target
            ? `Favorited ${target}`
            : "Added a favorite",
          createdAt: fav.created_at,
        });
      });

      (reviewsRes.data || []).forEach((r) => {
        const review = r as { id: string; created_at: string; store?: { name?: string } | null };
        combined.push({
          id: `review-${review.id}`,
          kind: "review",
          icon: Star,
          iconClass: "text-amber-500",
          iconBgClass: "bg-amber-500/10",
          label: review.store?.name
            ? `Reviewed ${review.store.name}`
            : "Left a review",
          createdAt: review.created_at,
        });
      });

      combined.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setActivity(combined.slice(0, 10));

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
  }, [profile, supabase]);

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
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
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
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold text-[var(--text)] mb-4">Profile</h1>

      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)] mb-6"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/profile?tab=${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={clsx(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors motion-reduce:transition-none",
              activeTab === tab.id
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            <tab.icon size={14} aria-hidden="true" />
            {tab.label}
            {tab.badge ? (
              <span
                aria-label={`${tab.badge} unread`}
                className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {tab.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="p-5 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
            <div className="flex items-start gap-4">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  width={96}
                  height={96}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[var(--border)]"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-xl font-bold"
                >
                  {getInitials(profile.full_name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-[var(--text)] truncate">
                  {profile.full_name}
                </h2>
                <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                  <Mail size={13} aria-hidden="true" />
                  {profile.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={clsx(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize",
                      profile.role === "seller"
                        ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                        : profile.role === "creator"
                          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "bg-[var(--background)] text-[var(--text-muted)]"
                    )}
                  >
                    {profile.role}
                  </span>
                  {profile.role === "seller" && !profile.is_approved && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--warning-soft)] text-[var(--warning)]">
                      Pending approval
                    </span>
                  )}
                </div>
              </div>
              <Link
                href="/profile/edit"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)]/30 hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
              >
                <Edit size={12} aria-hidden="true" />
                Edit
              </Link>
            </div>
          </div>

          {profile.role === "seller" && profile.is_approved && store && (
            <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <StoreIcon size={14} aria-hidden="true" />
                Seller links
              </h3>
              <div className="space-y-1">
                <Link
                  href={`/feed/${store.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--warning-soft)]">
                      <StoreIcon
                        size={16}
                        className="text-[var(--warning)]"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-sm font-medium text-[var(--text)]">
                      My store
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[var(--text-muted)]"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/seller/dashboard"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--primary-soft)]">
                      <BarChart3
                        size={16}
                        className="text-[var(--primary)]"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-sm font-medium text-[var(--text)]">
                      Seller dashboard
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[var(--text-muted)]"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-[var(--primary-soft)]">
                  <ShoppingBag
                    size={14}
                    className="text-[var(--primary)]"
                    aria-hidden="true"
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  Total orders
                </span>
              </div>
              <p className="text-xl font-bold text-[var(--text)] font-mono">
                {stats.orders}
              </p>
            </div>
            {profile.role === "seller" ? (
              <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-[var(--warning-soft)]">
                    <Package
                      size={14}
                      className="text-[var(--warning)]"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    Items sold
                  </span>
                </div>
                <p className="text-xl font-bold text-[var(--text)] font-mono">
                  {stats.itemsSold}
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-[var(--warning-soft)]">
                      <BarChart3
                        size={14}
                        className="text-[var(--warning)]"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Total spent
                    </span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text)] font-mono">
                    ৳{stats.totalSpent}
                  </p>
                </div>
                <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                      <Star
                        size={14}
                        className="text-amber-500"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Avg rating given
                    </span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text)] font-mono">
                    {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
                  </p>
                </div>
              </>
            )}
          </div>

          {activity.length > 0 && (
            <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <BarChart3 size={14} aria-hidden="true" />
                Recent activity
              </h3>
              <ol className="space-y-2" role="list">
                {activity.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                    >
                      <div
                        className={clsx(
                          "p-1.5 rounded-lg shrink-0",
                          entry.iconBgClass
                        )}
                      >
                        <Icon
                          size={14}
                          className={entry.iconClass}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-sm text-[var(--text)] flex-1 min-w-0 truncate">
                        {entry.label}
                      </p>
                      <time
                        dateTime={entry.createdAt}
                        title={format(new Date(entry.createdAt), "PPpp")}
                        className="text-[11px] text-[var(--text-subtle)] shrink-0"
                      >
                        {formatDistanceToNow(new Date(entry.createdAt), {
                          addSuffix: true,
                        })}
                      </time>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
              <Settings size={14} aria-hidden="true" />
              Settings
            </h3>
            <div className="space-y-1">
              <Link
                href="/profile/edit"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--background)]">
                    <User
                      size={16}
                      className="text-[var(--text-muted)]"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-sm text-[var(--text)]">
                    Edit name &amp; photo
                  </span>
                </div>
                <ChevronRight
                  size={16}
                  className="text-[var(--text-muted)]"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/profile/settings"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--primary-soft)]">
                    <Settings
                      size={16}
                      className="text-[var(--primary)]"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-sm text-[var(--text)]">Settings</span>
                </div>
                <ChevronRight
                  size={16}
                  className="text-[var(--text-muted)]"
                  aria-hidden="true"
                />
              </Link>
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--warning-soft)]">
                    {theme === "dark" ? (
                      <Sun
                        size={16}
                        className="text-[var(--warning)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <Moon
                        size={16}
                        className="text-[var(--warning)]"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <span className="text-sm text-[var(--text)]">
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </span>
                </div>
                <div
                  className={clsx(
                    "w-9 h-5 rounded-full transition-colors motion-reduce:transition-none relative",
                    theme === "dark" ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"
                  )}
                >
                  <div
                    className={clsx(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform motion-reduce:transition-none",
                      theme === "dark" ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--danger)]/5 transition-colors motion-reduce:transition-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--danger)]/10">
                    <LogOut
                      size={16}
                      className="text-[var(--danger)]"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-sm text-[var(--danger)] font-medium">
                    Sign out
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-2" role="tabpanel" aria-label="Notifications">
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-[var(--primary)] font-medium hover:underline mb-2"
            >
              Mark all as read
            </button>
          )}
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <article
                key={notif.id}
                className={clsx(
                  "p-4 bg-[var(--surface)] rounded-xl border transition-colors motion-reduce:transition-none",
                  notif.is_read
                    ? "border-[var(--border)]"
                    : "border-[var(--warning)]/30 bg-[var(--warning-soft)]/40"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {notif.is_read ? (
                      <CheckCircle2
                        size={16}
                        className="text-[var(--text-subtle)]"
                        aria-label="Read"
                      />
                    ) : (
                      <Circle
                        size={16}
                        className="text-[var(--warning)] fill-[var(--warning)]/20"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">
                      {notif.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                      {format(new Date(notif.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  {notif.link && (
                    <Link
                      href={notif.link}
                      className="text-xs text-[var(--primary)] font-medium shrink-0 hover:underline"
                    >
                      View
                    </Link>
                  )}
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              message="When sellers respond to your orders, you'll see updates here."
            />
          )}
        </div>
      )}

      {activeTab === "favorites" && (
        <div role="tabpanel" aria-label="Favorites">
          <EmptyState
            icon={Heart}
            title="Your favorites live on their own page"
            message="Browse the feed and tap the heart icon to save dishes and stores you love."
            ctaLabel="View my favorites"
            ctaHref="/profile/favorites"
          />
        </div>
      )}
    </div>
  );
}