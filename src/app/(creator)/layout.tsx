import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/components/ui/auth-provider";
import { CreatorSidebar } from "@/components/layout/creator-sidebar";
import { CreatorTopBar } from "@/components/layout/creator-top-bar";

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_banned")
    .eq("id", user.id)
    .single();

  if (profile?.is_banned) {
    redirect("/?error=Your+account+has+been+banned");
  }

  if (profile?.role !== "creator") {
    redirect("/feed");
  }

  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <CreatorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <CreatorTopBar />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-4 md:p-6 pb-20 md:pb-6"
          >
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
