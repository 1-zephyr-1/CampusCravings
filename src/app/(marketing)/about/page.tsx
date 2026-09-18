import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Heart,
  Sparkles,
  Users,
  GraduationCap,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "About — CampusCravings",
  description:
    "CampusCravings is a peer-to-peer food marketplace built by BRAC University students, for BRACU students. Read our story, mission, and meet the team.",
  alternates: { canonical: "/about" },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "About — CampusCravings",
    description:
      "A peer-to-peer food marketplace built by BRAC University students, for BRACU students.",
    type: "website",
    url: "/about",
    siteName: "CampusCravings",
  },
};

const VALUES = [
  {
    icon: Heart,
    title: "Student first",
    body: "Every decision we make starts with the question: does this help a BRACU student? If not, we don't ship it.",
  },
  {
    icon: Sparkles,
    title: "Zero commissions",
    body: "Sellers keep 100% of what they earn. We don't take a cut, we don't run ads, and we don't sell your data.",
  },
  {
    icon: Users,
    title: "Community trust",
    body: "Restricting access to verified @g.bracu.ac.bd emails keeps our marketplace safe, friendly, and on-campus.",
  },
];

const TEAM = [
  {
    name: "Zephyr Rahman",
    role: "Founder & Engineer",
    bio: "Computer Science senior at BRACU. Built the first prototype after waiting 40 minutes for a canteen samosa.",
  },
  {
    name: "Tahmid Khan",
    role: "Design Lead",
    bio: "CSE & Design double-major. Obsessed with making the app feel as warm as the food on it.",
  },
  {
    name: "Ayesha Siddiqua",
    role: "Community & Trust",
    bio: "BBA student and part-time home cook. Reviews every seller application and keeps the marketplace kind.",
  },
  {
    name: "Sabbir Hossain",
    role: "Backend & Data",
    bio: "CSE senior. Owns the order pipeline, the realtime notifications, and the analytics that keep us honest.",
  },
];

export default function AboutPage() {
  return (
    <>
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to home
        </Link>
      </div>

      {/* Hero / story */}
      <header className="max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-10 md:pb-14 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-semibold mb-4">
          <GraduationCap size={12} aria-hidden="true" />
          About CampusCravings
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text)] leading-tight">
          Built by BRACU students,
          <br className="hidden md:block" /> for BRACU students.
        </h1>
        <p className="mt-4 text-base md:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
          We got tired of long canteen queues and wanted a way to taste the
          amazing homemade food our friends were already cooking. So we built
          one — and turned it into a marketplace the whole campus can use.
        </p>
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-6 pb-16 md:pb-24 space-y-12 md:space-y-16">
        {/* Our story */}
        <section aria-labelledby="story-heading">
          <SectionHeader
            id="story-heading"
            title="Our story"
            subtitle="How a 40-minute wait became a campus-wide project."
            variant="accent-line"
            className="mb-5"
          />
          <div className="prose-like space-y-4 text-[var(--text-muted)] leading-relaxed text-sm md:text-base">
            <p>
              CampusCravings started in the spring of 2025 as a tiny spreadsheet
              shared between three friends who lived in the same BRACU dorm.
              The spreadsheet listed who was cooking what on which day — and
              who wanted to pre-order. Within a month, sixty other students
              had asked to be added.
            </p>
            <p>
              That was the moment we knew this couldn&apos;t stay in a
              spreadsheet. We spent the summer building the first version of
              the web app, then ran a six-week pilot with twenty student cooks
              and a hundred regular buyers. The canteen queues got shorter, the
              cooks earned a bit of pocket money, and a lot of new friendships
              started over a plate of biriyani.
            </p>
            <p>
              Today CampusCravings serves the entire BRAC University community.
              We&apos;re still a small, student-run team — and we plan to keep
              it that way. The platform is, and always will be, free for both
              buyers and sellers.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section aria-labelledby="mission-heading">
          <SectionHeader
            id="mission-heading"
            title="Our mission"
            subtitle="Why we exist."
            variant="accent-line"
            className="mb-5"
          />
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
            <p className="text-[var(--text)] text-base md:text-lg leading-relaxed">
              To make BRAC University a place where every student can share the
              food they love with the people they live, learn, and laugh with —
              without queues, without commissions, and without compromising the
              trust and safety of our campus community.
            </p>
          </div>
        </section>

        {/* Values */}
        <section aria-labelledby="values-heading">
          <SectionHeader
            id="values-heading"
            title="What we stand for"
            subtitle="Three principles guide every decision."
            variant="accent-line"
            className="mb-5"
          />
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {VALUES.map((value) => (
              <li
                key={value.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6"
              >
                <div
                  aria-hidden="true"
                  className="w-11 h-11 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center mb-3"
                >
                  <value.icon size={20} />
                </div>
                <h3 className="text-base font-semibold text-[var(--text)]">
                  {value.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                  {value.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Team */}
        <section aria-labelledby="team-heading">
          <SectionHeader
            id="team-heading"
            title="Meet the team"
            subtitle="A small group of BRACU students running the platform."
            variant="accent-line"
            className="mb-5"
          />
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {TEAM.map((member) => (
              <li
                key={member.name}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6"
              >
                <div
                  aria-hidden="true"
                  className="w-12 h-12 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-lg font-bold mb-3"
                >
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <h3 className="text-base font-semibold text-[var(--text)]">
                  {member.name}
                </h3>
                <p className="text-xs text-[var(--text-subtle)] uppercase tracking-wider mt-0.5">
                  {member.role}
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-3 leading-relaxed">
                  {member.bio}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section
          aria-label="Get involved"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 text-center"
        >
          <h2 className="text-lg md:text-xl font-bold text-[var(--text)]">
            Want to cook or eat with us?
          </h2>
          <p className="mt-2 text-sm md:text-base text-[var(--text-muted)] max-w-xl mx-auto">
            Apply to sell your favourite homemade dish, or just sign in and
            browse what&apos;s on the menu today.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-full hover:bg-[var(--primary-hover)] transition-colors"
            >
              Get started
            </Link>
            <Link
              href="/seller/pending"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] text-sm font-semibold rounded-full hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              Apply to sell
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
