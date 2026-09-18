"use client";

import { Search, Bell, Moon, Sun, Utensils } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/ui/auth-provider";
import { useSupabase } from "@/lib/supabase/use-client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/feed?q=${encodeURIComponent(searchQuery.trim())}`);
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
              className="w-full pl-9 pr-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 ml-auto">
          <Link
            href="/profile?tab=notifications"
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
