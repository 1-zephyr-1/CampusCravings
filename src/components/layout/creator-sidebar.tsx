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
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 min-h-screen sticky top-0">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <Link href="/creator" className="flex items-center gap-2">
          <Shield size={22} className="text-red-600" />
          <span className="text-lg font-bold text-gray-900 dark:text-white">
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
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium border-l-[3px]",
                isActive
                  ? "bg-red-50 text-red-600 border-red-600"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 border-transparent"
              )}
            >
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <Link
          href="/feed"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors"
        >
          ← Back to Feed
        </Link>
        {profile && (
          <div className="flex items-center gap-3 px-4 py-2 mt-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-bold">
              {profile.full_name?.[0] || profile.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {profile.full_name || "Creator"}
              </p>
              <p className="text-xs text-gray-500 truncate">{profile.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
