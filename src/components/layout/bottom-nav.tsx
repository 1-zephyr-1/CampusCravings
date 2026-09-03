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

  if (profile?.role === "seller" || profile?.role === "creator") {
    navItems.splice(2, 0, {
      href: "/seller/dashboard",
      label: "Seller",
      icon: ChefHat,
    });
  }

  if (profile?.role === "creator") {
    navItems.splice(navItems.length - 1, 0, {
      href: "/creator",
      label: "Admin",
      icon: Shield,
    });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-sand dark:bg-surface-dark dark:border-[#4A3D30] md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/feed"
              ? pathname === "/feed"
              : pathname.startsWith(item.href.split("?")[0]);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[56px]",
                isActive
                  ? "text-tomato"
                  : "text-bark hover:text-espresso dark:hover:text-cream"
              )}
            >
              <item.icon
                size={20}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span
                className={clsx(
                  "text-[10px] font-medium",
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
