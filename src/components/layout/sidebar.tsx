"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, User, ChefHat, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

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
    <aside className="hidden md:flex flex-col w-60 bg-surface border-r border-sand dark:bg-surface-dark dark:border-[#4A3D30] min-h-screen sticky top-0">
      <div className="p-6 border-b border-sand dark:border-[#4A3D30]">
        <Link href="/feed" className="flex items-center gap-2">
          <span className="text-2xl">🍛</span>
          <span className="text-xl font-bold text-espresso dark:text-cream">
            CampusCravings
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/feed"
              ? pathname === "/feed"
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
        {profile && (
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-tomato/20 flex items-center justify-center text-tomato text-sm font-bold">
              {profile.full_name?.[0] || profile.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-espresso dark:text-cream truncate">
                {profile.full_name || "Student"}
              </p>
              <p className="text-xs text-bark truncate">{profile.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-bark hover:bg-chili/10 hover:text-chili w-full transition-colors"
        >
          <LogOut size={18} strokeWidth={1.75} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
