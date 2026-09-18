"use client";

import { Search, Bell, Moon, Sun, Utensils } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/ui/auth-provider";
import { useSupabase } from "@/lib/supabase/use-client";
import { toast } from "@/components/ui/toast";
import {
  DEFAULT_NOTIF_PREFS,
  NOTIF_PREFS_STORAGE_KEY,
  type NotificationPrefKey,
  type NotificationPrefs,
} from "@/components/notifications/notification-prefs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NotificationType } from "@/types";

/**
 * Map a notification's `type` to its preference key. Falls back to
 * `orderUpdates` so we never silently drop a notification the user actually
 * cares about (e.g. `system` rows from platform maintenance notices).
 */
function prefKeyForType(type: NotificationType | undefined): NotificationPrefKey {
  switch (type) {
    case "message":
      return "messages";
    case "promotion":
      return "promotions";
    case "order":
    case "system":
    default:
      return "orderUpdates";
  }
}

function readPrefsSync(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_NOTIF_PREFS;
  try {
    const raw = window.localStorage.getItem(NOTIF_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIF_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      orderUpdates: parsed.orderUpdates ?? DEFAULT_NOTIF_PREFS.orderUpdates,
      messages: parsed.messages ?? DEFAULT_NOTIF_PREFS.messages,
      promotions: parsed.promotions ?? DEFAULT_NOTIF_PREFS.promotions,
    };
  } catch {
    return DEFAULT_NOTIF_PREFS;
  }
}

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    if (!profile) return;

    async function fetchUnread() {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile!.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    }

    fetchUnread();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile!.id}`,
        },
        (payload) => {
          const incoming = (payload.new ?? {}) as {
            title?: string;
            link?: string | null;
            type?: NotificationType;
          };

          setUnreadCount((prev) => prev + 1);

          // Honor the user's local notification preferences. If they opted out
          // of this category, still bump the bell badge but don't pop a toast.
          const prefs = readPrefsSync();
          if (prefs[prefKeyForType(incoming.type)]) {
            toast(
              incoming.title ?? "New notification",
              "info",
              incoming.link ? { label: "Open", href: incoming.link } : undefined
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)]/95 backdrop-blur-sm border-b border-[var(--border)]">
      <div className="flex items-center gap-3 h-14 px-4 md:px-6">
        {/* Logo (mobile-only because sidebar shows it on desktop) */}
        <Link
          href="/feed"
          className="flex items-center gap-2 md:hidden"
          aria-label="CampusCravings home"
        >
          <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
            <Utensils size={16} className="text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold text-[var(--text)]">
            CampusCravings
          </span>
        </Link>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          role="search"
          className="flex-1 max-w-xl mx-auto hidden sm:flex"
        >
          <div className="relative w-full">
            <label htmlFor="topbar-search" className="sr-only">
              Search food and sellers
            </label>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              id="topbar-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for food, sellers..."
              className="w-full pl-9 pr-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors motion-reduce:transition-none"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 ml-auto">
          <Link
            href="/notifications"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            className="relative p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg)] transition-colors motion-reduce:transition-none"
          >
            <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[var(--primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg)] transition-colors motion-reduce:transition-none"
          >
            {theme === "dark" ? (
              <Sun size={20} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Moon size={20} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
