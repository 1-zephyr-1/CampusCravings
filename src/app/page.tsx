"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BRACU_DOMAIN } from "@/lib/constants";
import { signInWithEmail, signUpWithEmail } from "@/lib/actions/auth";
import { useState } from "react";
import { clsx } from "clsx";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LandingPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "signup") {
      const result = await signUpWithEmail(email, password, fullName);
      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setSuccess(result.success || "Check your email!");
        setLoading(false);
      }
    } else {
      const result = await signInWithEmail(email, password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push("/feed");
        router.refresh();
      }
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">🍛</span>
            <h1 className="text-4xl md:text-5xl font-bold text-espresso dark:text-cream mb-2 tracking-tight">
              CampusCravings
            </h1>
            <p className="text-bark">
              Homemade food from fellow students
            </p>
            <p className="text-xs text-bark/50 mt-1">
              BRAC University&apos;s peer-to-peer food marketplace
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: "🍳", label: "Fresh Homemade" },
              { icon: "🎓", label: "Campus Only" },
              { icon: "🤝", label: "Student-to-Student" },
            ].map((feature) => (
              <div
                key={feature.label}
                className="bg-surface dark:bg-surface-dark rounded-xl p-3 border border-sand dark:border-[#4A3D30] text-center"
              >
                <span className="text-2xl mb-1 block">{feature.icon}</span>
                <p className="text-[11px] font-medium text-espresso dark:text-cream">
                  {feature.label}
                </p>
              </div>
            ))}
          </div>

          {/* Auth card */}
          <div className="bg-surface dark:bg-surface-dark rounded-2xl border border-sand dark:border-[#4A3D30] p-6">
            {/* Mode tabs */}
            <div className="flex gap-1 bg-cream dark:bg-cream-dark rounded-lg p-1 mb-5">
              <button
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                className={clsx(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  mode === "login"
                    ? "bg-surface dark:bg-surface-dark text-espresso dark:text-cream shadow-sm"
                    : "text-bark hover:text-espresso dark:hover:text-cream"
                )}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
                className={clsx(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  mode === "signup"
                    ? "bg-surface dark:bg-surface-dark text-espresso dark:text-cream shadow-sm"
                    : "text-bark hover:text-espresso dark:hover:text-cream"
                )}
              >
                Sign Up
              </button>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3 mb-4">
              {mode === "signup" && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-bark" size={16} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-cream border border-sand rounded-lg text-sm text-espresso placeholder:text-bark/50 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato dark:bg-cream-dark dark:border-[#4A3D30] dark:text-cream"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-bark" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`you@${BRACU_DOMAIN}`}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-cream border border-sand rounded-lg text-sm text-espresso placeholder:text-bark/50 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato dark:bg-cream-dark dark:border-[#4A3D30] dark:text-cream"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-bark" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-10 py-2.5 bg-cream border border-sand rounded-lg text-sm text-espresso placeholder:text-bark/50 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato dark:bg-cream-dark dark:border-[#4A3D30] dark:text-cream"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bark hover:text-espresso"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-tomato text-white rounded-lg font-semibold text-sm hover:bg-tomato-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  "Please wait..."
                ) : (
                  <>
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {error && (
              <p className="text-xs text-chili text-center mb-3">{error}</p>
            )}
            {success && (
              <p className="text-xs text-herb text-center mb-3">{success}</p>
            )}

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-sand dark:border-[#4A3D30]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-surface dark:bg-surface-dark px-3 text-xs text-bark">
                  or continue with
                </span>
              </div>
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 bg-cream dark:bg-cream-dark border border-sand dark:border-[#4A3D30] rounded-lg font-medium text-sm text-espresso dark:text-cream hover:bg-sand/30 dark:hover:bg-[#3A2E20] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              Sign in with Google
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-bark/50 mt-6 leading-relaxed text-center">
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
