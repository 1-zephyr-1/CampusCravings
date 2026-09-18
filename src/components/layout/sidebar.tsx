"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  ShoppingBag,
  User,
  ChefHat,
  Shield,
  LogOut,
  Utensils,
} from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";
import { useSupabase } from "@/lib/supabase/use-client";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();

  const navItems = [
    { href: "/feed", label: "Home", icon: Home },
    { href: "/feed?search=true", label: "Search", icon: Search },
    { href: "/orders", label: "My Orders", icon: ShoppingBag },
    { href: "/profile", label: "Profile", icon: User },
  ];

  if (profile?.role === "seller" || profile?.role === "creator") {
    navItems.splice(2, 0, {
      href: "/seller/dashboard",
      label: "Seller Hub",
      icon: ChefHat,
    });
  }

  if (profile?.role === "creator") {
    navItems.push({
      href: "/creator",
      label: "Admin Panel",
      icon: Shield,
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden md:flex flex-col w-60 bg-[var(--surface)] border-r border-[var(--border)] min-h-screen sticky top-0"
    >
      <div className="p-6 border-b border-[var(--border)]">
        <Link href="/feed" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center">
            <Utensils size={20} className="text-white" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold text-[var(--text)]">
            CampusCravings
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1" aria-label="Primary">
        {navItems.map((item) => {
          const isActive =
            item.href === "/feed"
              ? pathname === "/feed"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium border-l-[3px]",
                "motion-reduce:transition-none",
                isActive
                  ? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] border-transparent"
              )}
            >
              <item.icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border)]">
        {profile && (
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div
              className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] text-sm font-bold"
              aria-hidden="true"
            >
              {profile.full_name?.[0] || profile.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text)] truncate">
                {profile.full_name || "Student"}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {profile.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] w-full transition-colors motion-reduce:transition-none"
        >
          <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
