"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Store,
  Users,
  UtensilsCrossed,
  Tag,
  AlertTriangle,
  Shield,
  Activity,
} from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";
import { clsx } from "clsx";

const navItems = [
  { href: "/creator", label: "Stats", icon: BarChart3, exact: true },
  { href: "/creator/sellers", label: "Sellers", icon: Store },
  { href: "/creator/users", label: "Users", icon: Users },
  { href: "/creator/listings", label: "Listings", icon: UtensilsCrossed },
  { href: "/creator/categories", label: "Categories", icon: Tag },
  { href: "/creator/reports", label: "Reports", icon: AlertTriangle },
  { href: "/creator/activity", label: "Activity", icon: Activity },
];

export function CreatorSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  return (
    <aside
      aria-label="Creator navigation"
      className="hidden md:flex flex-col w-60 bg-[var(--surface)] border-r border-[var(--border)] min-h-screen sticky top-0"
    >
      <div className="p-6 border-b border-[var(--border)]">
        <Link href="/creator" className="flex items-center gap-2">
          <Shield size={22} className="text-[var(--primary)]" aria-hidden="true" />
          <span className="text-lg font-bold text-[var(--text)]">
            Creator Panel
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all motion-reduce:transition-none text-sm font-medium border-l-[3px]",
                isActive
                  ? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--text)] border-transparent"
              )}
            >
              <item.icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border)]">
        <Link
          href="/feed"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--text)] transition-colors motion-reduce:transition-none"
        >
          ← Back to Feed
        </Link>
        {profile && (
          <div className="flex items-center gap-3 px-4 py-2 mt-2">
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] text-sm font-bold"
            >
              {profile.full_name?.[0] || profile.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text)] truncate">
                {profile.full_name || "Creator"}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">{profile.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
