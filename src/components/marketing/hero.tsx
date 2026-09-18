"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, MapPin, ShieldCheck } from "lucide-react";

/**
 * Hero block at the top of the marketing landing page.
 * Communicates the value prop, supports light/dark, animates in with
 * staggered children (headline rises, subtitle fades, CTA scales in).
 *
 * Animation honours `prefers-reduced-motion` via the
 * `animate-hero-rise` keyframe rule in globals.css.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-30 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 20%, var(--primary-soft) 0%, transparent 60%), radial-gradient(50% 50% at 80% 60%, var(--warning-soft) 0%, transparent 60%)",
        }}
      />
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-semibold mb-5 animate-hero-rise motion-reduce:animate-none"
          style={{ animationDelay: "0ms" }}
        >
          <Sparkles size={12} aria-hidden="true" />
          BRAC University only
        </span>

        <h1
          className="text-4xl md:text-6xl font-bold tracking-tight text-[var(--text)] leading-[1.05] max-w-3xl mx-auto animate-hero-rise motion-reduce:animate-none"
          style={{ animationDelay: "120ms" }}
        >
          Skip the canteen queue.
          <br />
          <span className="text-[var(--primary)]">
            Order homemade food on campus.
          </span>
        </h1>

        <p
          className="mt-5 text-base md:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed animate-hero-rise motion-reduce:animate-none"
          style={{ animationDelay: "280ms" }}
        >
          Browse meals from your fellow BRACU students, pre-order in seconds,
          and pick up at a time that works for you. Cash on pickup — no apps to
          download, no commissions.
        </p>

        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-scale-in motion-reduce:animate-none"
          style={{ animationDelay: "440ms" }}
        >
          <Link
            href="#auth"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-full text-base font-semibold hover:bg-[var(--primary-hover)] shadow-md hover:shadow-lg transition-all motion-reduce:transition-none"
          >
            Get started — it&apos;s free
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-full text-base font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
          >
            Browse the feed
          </Link>
        </div>

        <ul
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--text-muted)] animate-hero-rise motion-reduce:animate-none"
          style={{ animationDelay: "600ms" }}
          aria-label="What makes CampusCravings different"
        >
          <li className="flex items-center gap-1.5">
            <MapPin size={14} className="text-[var(--primary)]" aria-hidden="true" />
            Pickup near you
          </li>
          <li className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[var(--primary)]" aria-hidden="true" />
            Verified BRACU sellers
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">💸</span>
            Pay on pickup, no fees
          </li>
        </ul>
      </div>
    </section>
  );
}
