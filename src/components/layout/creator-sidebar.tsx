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
];

export function CreatorSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-60 bg-surface border-r border-sand dark:bg-surface-dark dark:border-[#4A3D30] min-h-screen sticky top-0">
      <div className="p-6 border-b border-sand dark:border-[#4A3D30]">
        <Link href="/creator" className="flex items-center gap-2">
          <Shield size={22} className="text-tomato" />
          <span className="text-lg font-bold text-espresso dark:text-cream">
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
              className={clsx(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                isActive
                  ? "bg-tomato/10 text-tomato accent-line"
                  : "text-bark hover:bg-sand/50 dark:hover:bg-[#3A2E20] dark:text-cream/70"
              )}
            >
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sand dark:border-[#4A3D30]">
        <Link
          href="/feed"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-bark hover:bg-sand/50 dark:hover:bg-[#3A2E20] dark:text-cream/70 transition-colors"
        >
          ← Back to Feed
        </Link>
        {profile && (
          <div className="flex items-center gap-3 px-4 py-2 mt-2">
            <div className="w-8 h-8 rounded-full bg-tomato/20 flex items-center justify-center text-tomato text-sm font-bold">
              {profile.full_name?.[0] || profile.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-espresso dark:text-cream truncate">
                {profile.full_name || "Creator"}
              </p>
              <p className="text-xs text-bark truncate">{profile.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
