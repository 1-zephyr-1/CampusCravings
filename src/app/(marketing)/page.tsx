import Link from "next/link";
import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { SamplePreview } from "@/components/marketing/sample-preview";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Testimonials } from "@/components/marketing/testimonials";
import { AuthCard } from "@/components/marketing/auth-card";
import { jsonLdScript } from "@/lib/seo";

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
  },
};

/**
 * Public marketing landing page (route group `(marketing)` → URL `/`).
 *
 * Composed of:
 *   1. Hero — primary CTA + value prop
 *   2. SamplePreview — top-rated sellers + fresh items (server component, anon-readable)
 *   3. HowItWorks — 3-step explanation
 *   4. Testimonials — student quotes
 *   5. AuthCard — sign-in / sign-up form (anchored at #auth)
 *
 * No <AuthProvider> wrap here: this route is reachable by unauthenticated
 * visitors and only needs Supabase's anon key for the sample preview.
 */

const SITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CampusCravings",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  description:
    "BRAC University peer-to-peer food marketplace. Pre-order homemade meals from fellow students.",
  inLanguage: "en",
};
export default function MarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(SITE_JSONLD)}
      />
      <Hero />

      <SamplePreview />

      <HowItWorks />

      <Testimonials />

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
                Ready to skip the queue?
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
                Already have an account?{" "}
                <Link href="/feed" className="text-[var(--primary)] hover:underline">
                  Browse the feed →
                </Link>
              </p>
            </div>

            <AuthCard />
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-subtle)]">
          <p>© 2026 CampusCravings · BRAC University</p>
          <nav aria-label="Footer">
            <ul className="flex items-center gap-4">
              <li>
                <Link
                  href="/feed"
                  className="hover:text-[var(--text)] transition-colors"
                >
                  Browse
                </Link>
              </li>
              <li>
                <a
                  href="#auth"
                  className="hover:text-[var(--text)] transition-colors"
                >
                  Sign in
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
