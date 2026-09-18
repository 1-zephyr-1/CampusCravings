import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, FileText } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Terms of Service — CampusCravings",
  description:
    "The rules every BRACU student agrees to when using CampusCravings. Be kind, be honest, cook and eat safely.",
  alternates: { canonical: "/terms" },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Terms of Service — CampusCravings",
    description:
      "The rules every BRACU student agrees to when using CampusCravings.",
    type: "website",
    url: "/terms",
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
    id: "who-can-use",
    title: "Who can use CampusCravings",
    body: [
      "CampusCravings is open only to current BRAC University students with a valid @g.bracu.ac.bd email address. By creating an account you confirm that you are currently enrolled at BRACU and that the email you used belongs to you.",
      "If we discover that an account does not belong to a current BRACU student, we will suspend it.",
    ],
  },
  {
    id: "your-account",
    title: "Your account",
    body: [
      "You are responsible for keeping your sign-in email secure and for everything that happens under your account. Please don\u2019t share your sign-in codes with anyone \u2014 not even friends.",
      "If you suspect someone has accessed your account, change your email settings and contact us immediately.",
    ],
  },
  {
    id: "buyers",
    title: "If you\u2019re a buyer",
    body: [
      "Pre-orders are a commitment. If you place an order, please show up on time or cancel in advance so the seller isn\u2019t left with food they made for you.",
      "Payment is handled directly between you and the seller at pickup. CampusCravings does not process payments and is not responsible for disputes between buyers and sellers \u2014 though our moderators will help mediate when asked.",
    ],
  },
  {
    id: "sellers",
    title: "If you\u2019re a seller",
    body: [
      "All food you list must be homemade by you, prepared in a clean environment, and accurately described \u2014 including allergens and ingredients. Photos must show your actual food.",
      "You agree to honour orders you accept. If you need to cancel, do so as early as possible and message the buyer. Repeatedly cancelling accepted orders can result in suspension.",
      "You are responsible for complying with any local food-safety guidance applicable to home cooking in your residence.",
    ],
  },
  {
    id: "community-rules",
    title: "Community rules",
    body: [
      "Be kind. CampusCravings is a BRACU-only community built on trust. Harassment, hate speech, threats, or intimidation of other users will result in immediate suspension.",
      "Don\u2019t impersonate other students, sellers, or BRACU staff. Don\u2019t list food you didn\u2019t make, and don\u2019t use CampusCravings to sell anything that isn\u2019t food.",
      "Report issues honestly. Filing false reports to target another user is itself a violation.",
    ],
  },
  {
    id: "platform",
    title: "How the platform works",
    body: [
      "CampusCravings is provided free of charge. We do not take commissions on orders and we do not process payments. We may, at our discretion, change features, add limits, or \u2014 in extreme cases \u2014 discontinue the service. We\u2019ll give reasonable notice when we can.",
      "We may suspend or terminate accounts that violate these terms or that we reasonably believe pose a risk to the community.",
    ],
  },
  {
    id: "liability",
    title: "Liability",
    body: [
      "CampusCravings is a platform that connects BRACU students. We are not a restaurant, catering service, or food-safety authority. We do our best to verify sellers and moderate reports, but we cannot guarantee the safety, quality, or legality of any food exchanged between users.",
      "To the maximum extent permitted by law, CampusCravings and its team are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.",
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: [
      "We may update these terms occasionally. Material changes will be announced by email and on the home page at least 14 days before they take effect. Continuing to use CampusCravings after the effective date means you accept the updated terms.",
    ],
  },
];

export default function TermsPage() {
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
          <FileText size={12} aria-hidden="true" />
          Terms
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text)] leading-tight">
          Terms of Service
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
              Be a current BRACU student \u2014 that&apos;s who this is for.
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--primary)] mt-0.5" aria-hidden="true">•</span>
              Sellers must cook what they list. Buyers must show up.
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--primary)] mt-0.5" aria-hidden="true">•</span>
              Be kind to other students. We&apos;re a small community.
            </li>
          </ul>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-6 pb-16 md:pb-24 space-y-10 md:space-y-12">
        {/* Anchor nav */}
        <nav aria-label="Terms sections" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)] mb-2">
            On this page
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

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
          aria-label="Contact about terms"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8"
        >
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Questions about these terms?
          </h2>
          <p className="mt-2 text-sm md:text-base text-[var(--text-muted)]">
            Email us at{" "}
            <a
              href="mailto:legal@campuscravings.bracu"
              className="text-[var(--primary)] hover:underline"
            >
              legal@campuscravings.bracu
            </a>{" "}
            or use the Contact page.
          </p>
        </section>
      </div>

      <Footer />
    </>
  );
}
