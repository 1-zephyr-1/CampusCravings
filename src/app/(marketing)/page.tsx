import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Utensils } from "lucide-react";
import { Hero } from "@/components/marketing/hero";
import { SamplePreview } from "@/components/marketing/sample-preview";
import { SafetyBadges } from "@/components/marketing/safety-badges";
import { PopularCategories } from "@/components/marketing/popular-categories";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Testimonials } from "@/components/marketing/testimonials";
import { AuthCard } from "@/components/marketing/auth-card";
import { Footer } from "@/components/marketing/footer";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "CampusCravings — Skip the queue, eat homemade on campus",
  description:
    "Pre-order homemade food from fellow BRAC University students. Verified sellers, cash on pickup, no commissions. Browse today's menu and pick up at a time that works for you.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "CampusCravings — Skip the queue, eat homemade on campus",
    description:
      "Pre-order homemade food from fellow BRACU students. Cash on pickup, no commissions.",
    type: "website",
    url: "/",
    siteName: "CampusCravings",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "CampusCravings — homemade food marketplace for BRAC University",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CampusCravings — Skip the queue, eat homemade on campus",
    description:
      "Pre-order homemade food from fellow BRACU students. Cash on pickup, no commissions.",
    images: ["/og-default.png"],
  },
};

/**
 * Public marketing landing page (route group `(marketing)` → URL `/`).
 *
 * Composed of:
 *   1. Hero — primary CTA + value prop
 *   2. SamplePreview — top-rated sellers + fresh items (server component, anon-readable)
 *   3. SafetyBadges — BRACU-verified, cash on pickup, direct chat
 *   4. PopularCategories — quick chip filters into /feed
 *   5. HowItWorks — 3-step explanation
 *   6. Testimonials — student quotes (auto-rotating carousel)
 *   7. FinalCta — "Sign up to browse" wrap-up section
 *   8. AuthCard — sign-in / sign-up form (anchored at #auth)
 *
 * No <AuthProvider> wrap here: this route is reachable by unauthenticated
 * visitors and only needs Supabase's anon key for the sample preview.
 */

export default function MarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: organizationJsonLd() }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: websiteJsonLd() }}
      />
      <Hero />

      <SamplePreview />

      <SafetyBadges />

      <PopularCategories />

      <HowItWorks />

      <Testimonials />

      {/* Final CTA — different angle from #auth: this one is for visitors who
          are ready to browse but haven't decided on an account yet, while
          #auth is the sign-in flow for returning users. */}
      <section
        id="get-started"
        aria-labelledby="final-cta-heading"
        className="py-12 md:py-16 bg-[var(--background)] border-y border-[var(--border)]"
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center"
          >
            <Utensils size={26} />
          </div>
          <h2
            id="final-cta-heading"
            className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text)] leading-tight"
          >
            Ready to skip the canteen queue?
          </h2>
          <p className="mt-3 text-base md:text-lg text-[var(--text-muted)] leading-relaxed">
            Sign up to browse today&apos;s homemade meals from BRACU student
            cooks. Pre-order in seconds, pay on pickup, and never queue for the
            canteen again.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#auth"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-full text-base font-semibold hover:bg-[var(--primary-hover)] shadow-md hover:shadow-lg transition-all motion-reduce:transition-none"
            >
              Sign up to browse
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/feed"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-full text-base font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
            >
              See today&apos;s menu
            </Link>
          </div>
          <p className="mt-5 text-xs text-[var(--text-subtle)]">
            Already on CampusCravings?{" "}
            <Link
              href="#auth"
              className="text-[var(--primary)] hover:underline font-medium"
            >
              Sign in to your account
            </Link>
          </p>
        </div>
      </section>

      {/* Auth CTA — anchored so the hero "Get started" button can scroll here. */}
      <section
        id="auth"
        aria-labelledby="auth-heading"
        className="py-16 md:py-24 bg-[var(--surface)] border-t border-[var(--border)]"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="text-center md:text-left">
              <h2
                id="auth-heading"
                className="text-2xl md:text-4xl font-bold tracking-tight text-[var(--text)] leading-tight"
              >
                Sign in to your account
              </h2>
              <p className="mt-4 text-base md:text-lg text-[var(--text-muted)] leading-relaxed">
                Sign in with your <span className="font-semibold">@g.bracu.ac.bd</span>{" "}
                email to start browsing meals, placing pre-orders, and supporting
                student cooks across campus.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-[var(--text-muted)]">
                <li className="flex items-start gap-2">
                  <span
                    className="text-[var(--primary)] mt-0.5"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  Verified BRACU students only
                </li>
                <li className="flex items-start gap-2">
                  <span
                    className="text-[var(--primary)] mt-0.5"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  No commission, pay on pickup
                </li>
                <li className="flex items-start gap-2">
                  <span
                    className="text-[var(--primary)] mt-0.5"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  Pre-order so it&apos;s hot when you arrive
                </li>
              </ul>
              <p className="mt-6 text-xs text-[var(--text-subtle)]">
                New here?{" "}
                <Link
                  href="#get-started"
                  className="text-[var(--primary)] hover:underline font-medium"
                >
                  Learn how it works →
                </Link>
              </p>
            </div>

            <AuthCard />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
