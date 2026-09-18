import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Search, ChevronDown } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Help Center — CampusCravings",
  description:
    "Answers to common questions about CampusCravings — getting started, ordering food as a buyer, selling as a student cook, and staying safe on campus.",
  alternates: { canonical: "/help" },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Help Center — CampusCravings",
    description:
      "Answers to common questions about CampusCravings — getting started, ordering food, selling food, and staying safe.",
    type: "website",
    url: "/help",
    siteName: "CampusCravings",
  },
};

interface QA {
  q: string;
  a: string;
}

const SECTIONS: { id: string; title: string; subtitle: string; items: QA[] }[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    subtitle: "New to CampusCravings? Start here.",
    items: [
      {
        q: "What is CampusCravings?",
        a: "CampusCravings is a peer-to-peer food marketplace exclusively for BRAC University students. Fellow students cook homemade meals, post them on the platform, and you pre-order and pick up at a time that works for you — skipping the canteen queue and supporting student cooks at the same time.",
      },
      {
        q: "Who can use CampusCravings?",
        a: "Anyone with a valid BRAC University student email (ending in @g.bracu.ac.bd) can sign up — either to buy meals or to apply as a seller. We restrict access to verified BRACU students to keep the community trusted and on-campus.",
      },
      {
        q: "Do I need to download an app?",
        a: "No. CampusCravings is a web app that works in any modern browser on your phone, tablet, or laptop. You can also add it to your home screen for a one-tap experience — instructions appear the first time you open it on iOS or Android.",
      },
      {
        q: "How do I create an account?",
        a: "Visit the home page and tap \"Get started\" — you'll be asked to sign in with your @g.bracu.ac.bd email. We send a one-time code to your inbox; enter it, fill in a display name, and you're in.",
      },
    ],
  },
  {
    id: "for-buyers",
    title: "For Buyers",
    subtitle: "Pre-ordering, pickup, and payment.",
    items: [
      {
        q: "How do I place an order?",
        a: "Browse the feed, tap a meal you like, choose a quantity and a pickup time, and send the order. The seller is notified instantly and will confirm. You'll see the order status update in real time on the Orders page.",
      },
      {
        q: "When do I pay?",
        a: "CampusCravings does not process payments online. You pay the seller directly in cash (or via their preferred method, like bKash) at pickup. This keeps things simple and avoids platform commissions.",
      },
      {
        q: "Can I cancel an order?",
        a: "Yes — as long as the seller has not yet started preparing it. Open the order, tap \"Cancel\", and the seller will be notified. Be considerate: cancelling late means the seller may have already cooked for you.",
      },
      {
        q: "What if I'm late for pickup?",
        a: "Reach out to the seller in the in-app chat as soon as you know you'll be late. Sellers are usually flexible within a short window, but if you don't show up and don't message, the order may be cancelled and reported.",
      },
      {
        q: "What if something is wrong with my order?",
        a: "Tell the seller right away — most issues can be resolved in chat. If you need help from CampusCravings, use the Report button on the order or visit the Contact page and a moderator will step in.",
      },
      {
        q: "How do ratings and reviews work?",
        a: "After pickup, you'll be prompted to rate the meal 1–5 stars and optionally leave a short note. Reviews help other students find great cooks and keep sellers accountable.",
      },
    ],
  },
  {
    id: "for-sellers",
    title: "For Sellers",
    subtitle: "Cooking, posting, and managing orders.",
    items: [
      {
        q: "How do I apply to sell?",
        a: "From your profile, tap \"Apply to sell\". You'll fill in a short form (cuisine, kitchen location, a couple of sample dishes) and a moderator will review your application. Most approvals happen within 48 hours.",
      },
      {
        q: "What can I sell?",
        a: "Homemade food made by you — meals, snacks, baked goods, drinks. We do not allow re-sale of store-bought items, alcohol, or anything outside of normal homemade fare. Allergens and ingredients must be disclosed on each listing.",
      },
      {
        q: "How do I post a meal?",
        a: "From your seller dashboard, tap \"New listing\". Add a name, description, price, quantity available for the day, pickup window, and a photo. Listings go live immediately and are visible to all verified BRACU buyers.",
      },
      {
        q: "Are there any fees or commissions?",
        a: "No. CampusCravings is free for sellers. There are no commissions, listing fees, or transaction cuts. You keep 100% of what buyers pay you at pickup.",
      },
      {
        q: "How do I handle an order I receive?",
        a: "Open the seller dashboard. New orders appear at the top — accept or decline within a short window. Once accepted, mark the order \"Ready\" when the food is packed so the buyer knows to come.",
      },
      {
        q: "What if a buyer doesn't show up?",
        a: "Mark the order as \"No-show\" from your dashboard after the pickup window passes. Repeat no-shows are flagged on the buyer's account, and serious cases can lead to suspension.",
      },
    ],
  },
  {
    id: "account-safety",
    title: "Account & Safety",
    subtitle: "Verification, privacy, and reporting.",
    items: [
      {
        q: "Why do you require a @g.bracu.ac.bd email?",
        a: "Restricting access to verified BRACU student emails is how we keep CampusCravings a trusted campus community. We never use your email for marketing — only for sign-in and important account notices.",
      },
      {
        q: "What personal data does CampusCravings store?",
        a: "Only what we need to run the platform: your name, BRACU email, profile photo (optional), order history, and listings. We do not sell or share data with third parties. See the Privacy page for the full policy.",
      },
      {
        q: "How do I report a problem with a seller or buyer?",
        a: "Every order, listing, and profile has a Report button. Tap it, pick a reason, add an optional note, and submit. A moderator reviews reports within 24 hours and may suspend accounts that violate our community rules.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings → Account → Delete. This permanently removes your profile, listings, and order history. Pending orders must be completed or cancelled first.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      {/* Back link + page header */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to home
        </Link>
      </div>

      <header className="max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-8 md:pb-12 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-semibold mb-4">
          <Search size={12} aria-hidden="true" />
          Help center
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text)] leading-tight">
          How can we help?
        </h1>
        <p className="mt-3 text-base md:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
          Quick answers to the questions BRACU buyers and sellers ask most
          often. Can&apos;t find what you need?{" "}
          <Link
            href="/contact"
            className="text-[var(--primary)] hover:underline font-medium"
          >
            Get in touch
          </Link>
          .
        </p>
      </header>

      {/* Quick-jump navigation */}
      <nav
        aria-label="Help sections"
        className="max-w-4xl mx-auto px-4 md:px-6 pb-6"
      >
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-block px-3 py-1.5 text-xs md:text-sm font-medium rounded-full bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* FAQ sections */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 pb-16 md:pb-24 space-y-10 md:space-y-14">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
            <SectionHeader
              id={`${section.id}-heading`}
              title={section.title}
              subtitle={section.subtitle}
              variant="accent-line"
              className="mb-6"
            />

            <div className="space-y-3">
              {section.items.map((item, idx) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-colors hover:border-[var(--border-strong)]"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none p-4 md:p-5 select-none">
                    <span className="font-medium text-[var(--text)] text-sm md:text-base">
                      {item.q}
                    </span>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <div className="px-4 md:px-5 pb-4 md:pb-5 pt-0 border-t border-[var(--border)]">
                    <p className="text-sm md:text-base text-[var(--text-muted)] leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                  {/* Hidden index marker for screen readers */}
                  <span className="sr-only">
                    Question {idx + 1} of {section.items.length}
                  </span>
                </details>
              ))}
            </div>
          </section>
        ))}

        {/* Still need help callout */}
        <section
          aria-label="Still need help"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 text-center"
        >
          <h2 className="text-lg md:text-xl font-bold text-[var(--text)]">
            Still have a question?
          </h2>
          <p className="mt-2 text-sm md:text-base text-[var(--text-muted)] max-w-xl mx-auto">
            We&apos;re a small team of BRACU students — drop us a note and
            we&apos;ll get back to you within a day or two.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center mt-5 px-5 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-full hover:bg-[var(--primary-hover)] transition-colors"
          >
            Contact CampusCravings
          </Link>
        </section>
      </div>

      <Footer />
    </>
  );
}
