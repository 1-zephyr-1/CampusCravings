"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { ChevronRight, X, ShoppingBag } from "lucide-react";

/**
 * 3-step coachmark onboarding tour shown the first time a logged-in user
 * lands on /feed. Reads `campuscravings:onboarding-seen` from localStorage.
 *
 * - Renders an overlay (non-blocking) atop the feed — feed renders behind it
 *   so we never delay LCP.
 * - Only displays for authenticated users (anon visitors shouldn't see it).
 * - Animates in from the bottom; respects prefers-reduced-motion via the
 *   `motion-reduce:` Tailwind utility.
 */
export function OnboardingTour() {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  // Reveal the tour once auth resolves AND localStorage says it's new.
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(
        "campuscravings:onboarding-seen"
      );
      if (!seen) {
        // Slight delay so the feed has time to paint before we overlay it.
        const t = window.setTimeout(() => setVisible(true), 600);
        return () => window.clearTimeout(t);
      }
    } catch {
      // localStorage may throw in privacy modes — fail open and show tour.
      setVisible(true);
    }
  }, [user, loading]);

  if (!visible) return null;

  const total = STEPS.length;
  const isLast = step === total - 1;

  function persistSeen() {
    try {
      window.localStorage.setItem("campuscravings:onboarding-seen", "true");
    } catch {
      /* ignore */
    }
  }

  function handleSkip() {
    persistSeen();
    setVisible(false);
  }

  function handleNext() {
    if (isLast) {
      persistSeen();
      setVisible(false);
    } else {
      setStep((s) => s + 1);
    }
  }

  const current = STEPS[step];

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Welcome to CampusCravings"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-4 sm:bottom-6 sm:pb-6 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-sm bg-[var(--primary)] text-white rounded-2xl shadow-xl p-5 animate-slide-up motion-reduce:animate-none">
        {/* Header row: step counter + skip */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-white/80 tabular-nums">
            {step + 1} / {total}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            aria-label="Skip onboarding tour"
            className="p-1 -m-1 rounded text-white/70 hover:text-white transition-colors motion-reduce:transition-none"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Body — title + description + arrow to target */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <current.icon size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-tight">
              {current.title}
            </h2>
            <p className="text-sm text-white/85 mt-1 leading-relaxed">
              {current.body}
            </p>
          </div>
        </div>

        {/* Step indicator dots */}
        <div
          className="flex items-center justify-center gap-1.5 mt-4 mb-1"
          aria-hidden="true"
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`block rounded-full transition-all motion-reduce:transition-none ${
                i === step
                  ? "w-5 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/35"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-medium text-white/75 hover:text-white px-2 py-1 transition-colors motion-reduce:transition-none"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-white text-[var(--primary)] text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition-all motion-reduce:transition-none"
          >
            {isLast ? "Got it" : "Next"}
            {!isLast && <ChevronRight size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: ShoppingBag,
    title: "Browse stores",
    body: "Find homemade food from sellers around campus.",
  },
  {
    icon: ShoppingBag,
    title: "Click to view menu",
    body: "Tap any item to see photos and add it to your cart.",
  },
  {
    icon: ShoppingBag,
    title: "Checkout in seconds",
    body: "Pick a pickup time and place your order.",
  },
] as const;
