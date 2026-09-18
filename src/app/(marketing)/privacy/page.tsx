import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Shield } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Privacy Policy — CampusCravings",
  description:
    "How CampusCravings collects, uses, and protects your personal information. Short version: only what we need, never sold, never shared with advertisers.",
  alternates: { canonical: "/privacy" },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Privacy Policy — CampusCravings",
    description: "How CampusCravings collects, uses, and protects your information.",
    type: "website",
    url: "/privacy",
    siteName: "CampusCravings",
  },
};

const LAST_UPDATED = "September 18, 2026";

interface Section {
  id: string;
  title: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    id: "what-we-collect",
    title: "What we collect",
    body: [
      "To create an account we ask for your BRAC University email address (used for sign-in) and a display name of your choice. If you apply to sell, we also store a short bio, your kitchen pickup area, and any photos you upload of your dishes.",
      "We automatically collect minimal device and usage data (browser type, page views, basic error logs) to keep the service stable and detect abuse.",
    ],
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    body: [
      "We use your information to operate the marketplace: show listings to the right people, route orders between buyers and sellers, send important notifications about your orders, and prevent spam or fraud.",
      "We do not use your data for targeted advertising, and we do not sell or rent it to third parties. Ever.",
    ],
  },
  {
    id: "who-can-see-what",
    title: "Who can see what",
    body: [
      "Verified BRACU students can see your public profile (display name, photo if uploaded, average rating, and your active listings). Buyers can see your first name and pickup area on active orders. Sellers can see your first name and pickup time on orders they receive.",
      "CampusCravings moderators can see account-level data when investigating reports. We never share your data with external services beyond our hosting and email providers.",
    ],
  },
  {
    id: "cookies-and-storage",
    title: "Cookies & local storage",
    body: [
      "We use a small number of essential cookies and browser storage items to keep you signed in and remember your preferences (like dark mode). We do not use third-party tracking cookies.",
    ],
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: [
      "You can update your profile, change your display name, or delete your account at any time from Settings. Deleting your account removes your profile, listings, and order history within 30 days, except for records we are legally required to keep.",
      "If you have any questions or want to exercise your rights, reach out via the Contact page.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: [
      "If we make material changes to this policy we will email all active accounts and post a notice on the home page at least 14 days before the changes take effect.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to home
        </Link>
      </div>

      <header className="max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-8 md:pb-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-semibold mb-4">
          <Shield size={12} aria-hidden="true" />
          Privacy
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text)] leading-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm md:text-base text-[var(--text-muted)]">
          Last updated {LAST_UPDATED}.
        </p>

        {/* Short version callout */}
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
            The short version
          </h2>
          <ul className="mt-3 space-y-2 text-sm md:text-base text-[var(--text-muted)]">
            <li className="flex gap-2">
              <span className="text-[var(--primary)] mt-0.5" aria-hidden="true">•</span>
              We collect only what we need to run the marketplace.
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--primary)] mt-0.5" aria-hidden="true">•</span>
              We never sell or share your data with advertisers.
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--primary)] mt-0.5" aria-hidden="true">•</span>
              You can delete your account and data at any time.
            </li>
          </ul>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-6 pb-16 md:pb-24 space-y-10 md:space-y-12">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
            <SectionHeader
              id={`${section.id}-heading`}
              title={section.title}
              variant="accent-line"
              className="mb-4"
            />
            <div className="space-y-3 text-sm md:text-base text-[var(--text-muted)] leading-relaxed">
              {section.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}

        <section
          aria-label="Questions about privacy"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8"
        >
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Questions about your data?
          </h2>
          <p className="mt-2 text-sm md:text-base text-[var(--text-muted)]">
            Email us at{" "}
            <a
              href="mailto:privacy@campuscravings.bracu"
              className="text-[var(--primary)] hover:underline"
            >
              privacy@campuscravings.bracu
            </a>{" "}
            or use the Contact page — we usually reply within a couple of days.
          </p>
        </section>
      </div>

      <Footer />
    </>
  );
}
