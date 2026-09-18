"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Utensils,
  GraduationCap,
  Users,
  AlertCircle,
} from "lucide-react";
import { useSupabase } from "@/lib/supabase/use-client";
import { BRACU_DOMAIN } from "@/lib/constants";
import { signInWithEmail, signUpWithEmail } from "@/lib/actions/auth";
import { isBracuEmail } from "@/lib/validators/email";

/**
 * Sign-in / sign-up card embedded in the marketing landing page.
 * Pure client component — relies on the parent for layout and spacing.
 */
export function AuthCard() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <AuthCardInner />
    </Suspense>
  );
}

/** Skeleton shown while search params hydrate on the landing page. */
function AuthCardFallback() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 shadow-sm h-[420px]" />
    </div>
  );
}

function AuthCardInner() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();

  // Surface OAuth / callback errors passed back as ?error=...
  const urlError = searchParams.get("error") ?? "";
  const displayError = error || urlError;
  // Show the domain warning once the user has typed something email-shaped
  // (contains an '@') but it isn't a BRACU address. We only warn — server
  // validation still rejects the submission outright.
  const showDomainWarning =
    email.includes("@") && email.trim().length > 0 && !isBracuEmail(email);

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
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

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError("");
    setSuccess("");
    // Drop the ?error= param so a stale banner doesn't linger.
    if (urlError) {
      const params = new URLSearchParams(window.location.search);
      params.delete("error");
      const query = params.toString();
      router.replace(query ? `/?${query}` : "/", { scroll: false });
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

  const showGoogle =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== "your-google-client-id";

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Feature badges */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { icon: Utensils, label: "Fresh homemade" },
          { icon: GraduationCap, label: "Campus only" },
          { icon: Users, label: "Peer-to-peer" },
        ].map((feature) => (
          <div
            key={feature.label}
            className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)] text-center"
          >
            <feature.icon
              size={22}
              className="text-[var(--primary)] mx-auto mb-1"
              aria-hidden="true"
            />
            <p className="text-[11px] font-medium text-[var(--text)]">
              {feature.label}
            </p>
          </div>
        ))}
      </div>

      {/* Auth card */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
        {/* Mode tabs */}
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="flex gap-1 bg-[var(--background)] rounded-lg p-1 mb-5"
        >
          <button
            role="tab"
            type="button"
            aria-selected={mode === "login"}
            aria-controls="auth-panel"
            onClick={() => switchMode("login")}
            className={clsx(
              "flex-1 py-2 rounded-md text-sm font-medium transition-colors motion-reduce:transition-none",
              mode === "login"
                ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            Sign in
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={mode === "signup"}
            aria-controls="auth-panel"
            onClick={() => switchMode("signup")}
            className={clsx(
              "flex-1 py-2 rounded-md text-sm font-medium transition-colors motion-reduce:transition-none",
              mode === "signup"
                ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            Sign up
          </button>
        </div>

        <div id="auth-panel" role="tabpanel">
          {/* Email form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3 mb-4">
            {mode === "signup" && (
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  size={16}
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  aria-label="Full name"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                />
              </div>
            )}

            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                size={16}
                aria-hidden="true"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`you@${BRACU_DOMAIN}`}
                aria-label="Email address"
                aria-invalid={showDomainWarning ? "true" : undefined}
                aria-describedby={showDomainWarning ? "email-domain-warning" : undefined}
                required
                className={clsx(
                  "w-full pl-9 pr-4 py-2.5 bg-[var(--background)] border rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]",
                  showDomainWarning
                    ? "border-[var(--danger)]"
                    : "border-[var(--border)]"
                )}
              />
              {showDomainWarning && (
                <p
                  id="email-domain-warning"
                  role="status"
                  className="mt-1.5 flex items-start gap-1.5 text-xs text-[var(--danger)]"
                >
                  <AlertCircle
                    size={12}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    Only BRAC University emails (@{BRACU_DOMAIN}) are accepted.
                  </span>
                </p>
              )}
            </div>

            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                size={16}
                aria-hidden="true"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                aria-label="Password"
                required
                minLength={6}
                className="w-full pl-9 pr-10 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {mode === "login" && (
              <div className="flex justify-end -mt-1">
                <Link
                  href="/forgot-password"
                  className="text-xs text-[var(--primary)] hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all motion-reduce:transition-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                "Please wait..."
              ) : (
                <>
                  {mode === "login" ? "Sign in" : "Create account"}
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {displayError && (
            <p
              role="alert"
              className="text-xs text-[var(--danger)] text-center mb-3"
            >
              {displayError}
            </p>
          )}
          {success && (
            <p
              role="status"
              className="text-xs text-[var(--success)] text-center mb-3"
            >
              {success}
            </p>
          )}

          {showGoogle && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[var(--surface)] px-3 text-xs text-[var(--text-muted)]">
                    or continue with
                  </span>
                </div>
              </div>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg font-medium text-sm text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all motion-reduce:transition-none flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
            </>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-[var(--text-subtle)] mt-6 leading-relaxed text-center">
        By signing in, you agree that CampusCravings only facilitates listings
        and orders. We are not responsible for food safety or quality. Sellers
        are independent students.
      </p>
    </div>
  );
}
