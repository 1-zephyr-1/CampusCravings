"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BRACU_DOMAIN } from "@/lib/constants";
import { UtensilsCrossed } from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: BRACU_DOMAIN,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-5xl">🍛</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-espresso dark:text-cream mb-3 tracking-tight">
            CampusCravings
          </h1>
          <p className="text-lg text-bark mb-2">
            Homemade food from fellow students
          </p>
          <p className="text-sm text-bark/60 mb-10">
            BRAC University&apos;s peer-to-peer food marketplace
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { icon: "🍳", label: "Fresh Homemade" },
              { icon: "🎓", label: "Campus Only" },
              { icon: "🤝", label: "Student-to-Student" },
            ].map((feature) => (
              <div
                key={feature.label}
                className="bg-surface dark:bg-surface-dark rounded-xl p-3 border border-sand dark:border-[#4A3D30]"
              >
                <span className="text-2xl mb-1 block">{feature.icon}</span>
                <p className="text-xs font-medium text-espresso dark:text-cream">
                  {feature.label}
                </p>
              </div>
            ))}
          </div>

          {/* Sign in */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 bg-tomato text-white rounded-xl font-semibold text-sm hover:bg-tomato-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              "Redirecting..."
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with BRACU Google
              </>
            )}
          </button>

          {error && (
            <p className="mt-3 text-sm text-chili text-center">{error}</p>
          )}

          {/* Disclaimer */}
          <p className="text-[11px] text-bark/50 mt-6 leading-relaxed">
            By signing in, you agree that CampusCravings only facilitates
            listings and orders. We are not responsible for food safety or
            quality. Sellers are independent students.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-sand dark:border-[#4A3D30]">
        <p className="text-xs text-bark/40">
          © 2026 CampusCravings · BRAC University
        </p>
      </footer>
    </div>
  );
}
