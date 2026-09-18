"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, Utensils } from "lucide-react";
import { clsx } from "clsx";

import { requestPasswordReset } from "@/lib/actions/auth";
import { BRACU_DOMAIN } from "@/lib/constants";
import { isBracuEmail } from "@/lib/validators/email";

/**
 * "Enter your email to get a reset link" page. After a successful submit we
 * show a confirmation <EmptyState> with a "Back to sign in" link so the user
 * always has a clear path forward.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const showDomainWarning =
    email.includes("@") && email.trim().length > 0 && !isBracuEmail(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await requestPasswordReset(email);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSubmitted(true);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/#auth"
            aria-label="Back to home"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] mb-6"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            Back to home
          </Link>
          <Utensils
            size={36}
            aria-hidden="true"
            className="text-[var(--primary)] mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-[var(--text)] mb-1">
            Forgot your password?
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Enter your BRACU email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
          {submitted ? (
            <div
              role="status"
              className="text-center py-4"
            >
              <div
                aria-hidden="true"
                className="w-14 h-14 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-4"
              >
                <Mail size={24} className="text-[var(--success)]" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text)] mb-2">
                Check your inbox
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                If an account exists for{" "}
                <span className="font-medium text-[var(--text)]">{email}</span>
                , we&apos;ve sent a password reset link. The link expires in 1
                hour.
              </p>
              <Link
                href="/#auth"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-sm font-medium text-[var(--text)] mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    size={16}
                    aria-hidden="true"
                  />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`you@${BRACU_DOMAIN}`}
                    aria-label="Email address"
                    aria-invalid={showDomainWarning ? "true" : undefined}
                    required
                    autoFocus
                    className={clsx(
                      "w-full pl-9 pr-4 py-2.5 bg-[var(--background)] border rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]",
                      showDomainWarning
                        ? "border-[var(--danger)]"
                        : "border-[var(--border)]"
                    )}
                  />
                </div>
                {showDomainWarning && (
                  <p
                    role="status"
                    className="mt-1.5 text-xs text-[var(--danger)]"
                  >
                    Only BRAC University emails (@{BRACU_DOMAIN}) are
                    accepted.
                  </p>
                )}
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-xs text-[var(--danger)] text-center"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all motion-reduce:transition-none disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>

              <p className="text-xs text-[var(--text-muted)] text-center">
                Remembered it?{" "}
                <Link
                  href="/#auth"
                  className="text-[var(--primary)] hover:underline font-medium"
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
