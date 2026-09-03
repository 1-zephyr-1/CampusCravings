"use client";

import { AuthProvider, useAuth } from "@/components/ui/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function SellerGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!profile || (profile.role !== "seller" && profile.role !== "creator"))) {
      router.replace("/feed");
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 border-3 border-tomato border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile || (profile.role !== "seller" && profile.role !== "creator")) {
    return null;
  }

  return <>{children}</>;
}

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SellerGuard>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
          </div>
          <BottomNav />
        </div>
      </SellerGuard>
    </AuthProvider>
  );
}
