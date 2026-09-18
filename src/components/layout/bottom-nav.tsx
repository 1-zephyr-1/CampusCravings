"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, User, ChefHat, Shield } from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";
import { clsx } from "clsx";

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const navItems = [
    { href: "/feed", label: "Home", icon: Home },
    { href: "/feed?search=true", label: "Search", icon: Search },
    { href: "/orders", label: "Orders", icon: ShoppingBag },
    { href: "/profile", label: "Profile", icon: User },
  ];

  // Insert Seller tab for users who are actually sellers.
  if (profile?.role === "seller" || profile?.role === "creator") {
    navItems.splice(2, 0, {
      href: "/seller/dashboard",
      label: "Seller",
      icon: ChefHat,
    });
  }

  // Insert Admin tab — only for creator role.
  if (profile?.role === "creator") {
    navItems.splice(navItems.length - 1, 0, {
      href: "/creator",
      label: "Admin",
      icon: Shield,
    });
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t border-[var(--border)] md:hidden pb-[env(safe-area-inset-bottom,0)]"
    >
      <div className="flex items-stretch justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/feed"
              ? pathname === "/feed"
              : pathname.startsWith(item.href.split("?")[0]);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[64px] py-1.5 rounded-lg transition-colors",
                "motion-reduce:transition-none",
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              <item.icon
                size={22}
                strokeWidth={isActive ? 2.25 : 1.75}
                aria-hidden="true"
              />
              <span
                className={clsx(
                  "text-xs font-medium",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
