import { AuthProvider } from "@/components/ui/auth-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main
              id="main-content"
              className="flex-1 pb-20 md:pb-0"
              tabIndex={-1}
            >
              {children}
            </main>
          </div>
          <BottomNav />
        </div>
        <KeyboardShortcuts />
      </CartProvider>
    </AuthProvider>
  );
}
