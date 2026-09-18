import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Mail,
  MapPin,
  MessageSquare,
  Clock,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Footer } from "@/components/marketing/footer";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact — CampusCravings",
  description:
    "Get in touch with the CampusCravings team. We\u2019re a small group of BRACU students and we usually reply within a day or two.",
  alternates: { canonical: "/contact" },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Contact — CampusCravings",
    description:
      "Get in touch with the CampusCravings team. We usually reply within a day or two.",
    type: "website",
    url: "/contact",
    siteName: "CampusCravings",
  },
};

interface Channel {
  icon: typeof Mail;
  title: string;
  value: string;
  href: string | null;
  note: string;
  external?: boolean;
}

const CHANNELS: Channel[] = [
  {
    icon: Mail,
    title: "Email",
    value: "hello@campuscravings.bracu",
    href: "mailto:hello@campuscravings.bracu",
    note: "Best for general questions, bug reports, and partnership ideas.",
  },
  {
    icon: MessageSquare,
    title: "In-app chat",
    value: "Open the app",
    href: "/feed",
    note: "Reach a seller or our moderators directly from any order.",
  },
  {
    icon: MapPin,
    title: "Where we are",
    value: "BRAC University, Merul Badda",
    href: null,
    note: "We\u2019re students — no formal office, but you\u2019ll spot us in the cafeteria.",
  },
];

export default function ContactPage() {
  return (
    <>
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to home
        </Link>
      </div>

      <header className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-8 md:pb-12 text-center md:text-left">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-semibold mb-4">
          <Mail size={12} aria-hidden="true" />
          Contact
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text)] leading-tight">
          Talk to the team
        </h1>
        <p className="mt-3 text-base md:text-lg text-[var(--text-muted)] max-w-2xl leading-relaxed">
          We&apos;re a small group of BRACU students running CampusCravings on
          the side of our coursework. Drop us a note and we&apos;ll get back to
          you within a day or two.
        </p>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-16 md:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12">
          {/* Form (left, wider) */}
          <section
            aria-labelledby="contact-form-heading"
            className="md:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8"
          >
            <SectionHeader
              id="contact-form-heading"
              title="Send us a message"
              subtitle="Your email client will open with your message pre-filled."
              className="mb-6"
            />

            <ContactForm />

            <p className="mt-4 text-xs text-[var(--text-subtle)] flex items-start gap-1.5">
              <Clock size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
              Typical reply time: 1\u20132 days during the semester. Up to a
              week during exams.
            </p>
          </section>

          {/* Channels (right) */}
          <aside
            aria-labelledby="channels-heading"
            className="md:col-span-2 space-y-5"
          >
            <h2
              id="channels-heading"
              className="text-base md:text-lg font-bold text-[var(--text)]"
            >
              Other ways to reach us
            </h2>
            <ul className="space-y-3">
              {CHANNELS.map((channel) => (
                <li
                  key={channel.title}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5"
                >
                  <ChannelRow channel={channel} />
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                Reporting a safety issue?
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                For urgent safety concerns involving food, please email us
                directly at{" "}
                <a
                  href="mailto:safety@campuscravings.bracu"
                  className="text-[var(--primary)] hover:underline font-medium"
                >
                  safety@campuscravings.bracu
                </a>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </>
  );
}

function ChannelRow({ channel }: { channel: Channel }) {
  const inner = (
    <div className="flex items-start gap-3">
      <div
        aria-hidden="true"
        className="shrink-0 w-10 h-10 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center"
      >
        <channel.icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">
          {channel.title}
        </p>
        <p className="text-sm font-semibold text-[var(--text)] truncate">
          {channel.value}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
          {channel.note}
        </p>
      </div>
    </div>
  );

  if (!channel.href) {
    return inner;
  }

  // External mailto: -> plain <a>, internal link -> next/link
  if (channel.href.startsWith("mailto:") || channel.href.startsWith("http")) {
    return (
      <a href={channel.href} className="block hover:opacity-80 transition-opacity">
        {inner}
      </a>
    );
  }

  return (
    <Link href={channel.href} className="block hover:opacity-80 transition-opacity">
      {inner}
    </Link>
  );
}
