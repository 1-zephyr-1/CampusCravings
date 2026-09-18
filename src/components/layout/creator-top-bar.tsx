"use client";

import { Bell, Moon, Sun, Shield } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/ui/auth-provider";
import { useSupabase } from "@/lib/supabase/use-client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GlobalSearch } from "@/components/creator/global-search";

export function CreatorTopBar() {
  const { theme, setTheme } = useTheme();
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
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
      .channel("creator-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile!.id}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase]);

  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)]/95 backdrop-blur-sm border-b border-[var(--border)]">
      <div className="flex items-center gap-3 h-14 px-4 md:px-6">
        {/* Mobile logo (sidebar shows logo on desktop). */}
        <Link
          href="/creator"
          className="flex items-center gap-2 md:hidden"
          aria-label="Creator dashboard"
        >
          <div className="w-8 h-8 bg-[var(--primary-soft)] rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-[var(--primary)]" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold text-[var(--text)]">
            Creator
          </span>
        </Link>

        <GlobalSearch />

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