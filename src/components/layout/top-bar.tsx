"use client";

import { Search, Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/ui/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const supabase = createClient();

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
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-sand dark:bg-surface-dark/95 dark:border-[#4A3D30]">
      <div className="flex items-center gap-4 h-14 px-4 md:px-6">
        {/* Logo - mobile */}
        <Link href="/feed" className="flex items-center gap-2 md:hidden">
          <span className="text-xl">🍛</span>
          <span className="text-lg font-bold text-espresso dark:text-cream">
            CampusCravings
          </span>
        </Link>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-xl mx-auto hidden sm:flex"
        >
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-bark"
              size={16}
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for food, sellers..."
              className="w-full pl-9 pr-4 py-2 bg-cream border border-sand rounded-lg text-sm text-espresso placeholder:text-bark/60 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato dark:bg-cream-dark dark:border-[#4A3D30] dark:text-cream dark:placeholder:text-cream/40"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          {/* Notifications */}
          <Link
            href="/profile?tab=notifications"
            className="relative p-2 rounded-lg text-bark hover:bg-sand/50 dark:hover:bg-[#3A2E20] dark:text-cream/70 transition-colors"
          >
            <Bell size={20} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-tomato text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* Dark mode toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-bark hover:bg-sand/50 dark:hover:bg-[#3A2E20] dark:text-cream/70 transition-colors"
          >
            {theme === "dark" ? (
              <Sun size={20} strokeWidth={1.75} />
            ) : (
              <Moon size={20} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
