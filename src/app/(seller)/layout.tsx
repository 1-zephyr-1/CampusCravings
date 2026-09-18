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
      <div
        role="status"
        aria-label="Loading"
        className="flex min-h-screen items-center justify-center"
      >
        <span className="h-8 w-8 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (profile?.is_banned) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-[var(--danger)]">
          Your account has been banned. Contact support.
        </p>
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
            <main id="main-content" className="flex-1 pb-20 md:pb-0">{children}</main>
          </div>
          <BottomNav />
        </div>
      </SellerGuard>
    </AuthProvider>
  );
}
