"use client";

import { useEffect, useRef, useState } from "react";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  year: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I sold out of my chicken biryani within 30 minutes. The orders were easy to manage and the ratings helped me get repeat customers.",
    name: "Sadia R.",
    year: "CSE '26",
  },
  {
    quote:
      "Saved me at 8 PM after a long study session. Homemade khichuri from a senior — beats the canteen any day.",
    name: "Tahmid K.",
    year: "BBA '25",
  },
  {
    quote:
      "Being able to filter by vegetarian and gluten-free was a game-changer. I actually use this weekly now.",
    name: "Nusrat J.",
    year: "Economics '27",
  },
];

const ROTATION_MS = 5000;

/**
 * Testimonials carousel. Auto-rotates every 5s with a fade transition,
 * pauses on hover or focus, and stops entirely when the visitor has
 * `prefers-reduced-motion: reduce` set. Manual prev/next buttons are
 * keyboard accessible and update the paused state on interaction.
 */
export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect prefers-reduced-motion at runtime so SSR + CSR match.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Auto-rotate. Pause when `paused` (hover/focus) or reduced-motion.
  useEffect(() => {
    if (paused || reducedMotion) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, ROTATION_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, reducedMotion]);

  function go(next: number) {
    setIndex(((next % TESTIMONIALS.length) + TESTIMONIALS.length) % TESTIMONIALS.length);
  }

  if (TESTIMONIALS.length === 0) return null;

  const current = TESTIMONIALS[index];

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="py-12 md:py-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <h2
          id="testimonials-heading"
          className="text-xl md:text-2xl font-bold text-[var(--text)] text-center mb-8"
        >
          What students say
        </h2>

        {/* Carousel viewport — keeps a stable height so the fade transition
            doesn't cause layout shift when the quote length changes. */}
        <div
          className="relative max-w-2xl mx-auto"
          aria-roledescription="carousel"
          aria-label="Student testimonials"
        >
          <div
            className="relative min-h-[180px] md:min-h-[160px]"
            aria-live={reducedMotion ? "polite" : "off"}
          >
            {TESTIMONIALS.map((t, i) => (
              <article
                key={t.name}
                className={`absolute inset-0 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl ${
                  reducedMotion ? "" : "animate-carousel-fade motion-reduce:animate-none"
                }`}
                style={
                  reducedMotion
                    ? { display: i === index ? "block" : "none" }
                    : {
                        opacity: i === index ? 1 : 0,
                        transition: "opacity 500ms ease-out",
                        pointerEvents: i === index ? "auto" : "none",
                        animation: "none",
                      }
                }
                aria-hidden={i !== index}
              >
                <Quote
                  size={20}
                  className="text-[var(--primary)] mb-3"
                  aria-hidden="true"
                />
                <p className="text-sm md:text-base text-[var(--text)] leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-4">
                  <span className="font-semibold text-[var(--text)]">
                    {t.name}
                  </span>{" "}
                  · {t.year}
                </p>
              </article>
            ))}
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous testimonial"
              className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors motion-reduce:transition-none"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>

            <div
              role="tablist"
              aria-label="Select testimonial"
              className="flex items-center gap-2"
            >
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show testimonial ${i + 1} of ${TESTIMONIALS.length}`}
                  onClick={() => go(i)}
                  className={`h-2 rounded-full transition-all motion-reduce:transition-none ${
                    i === index
                      ? "w-6 bg-[var(--primary)]"
                      : "w-2 bg-[var(--border-strong)] hover:bg-[var(--primary)]/50"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next testimonial"
              className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors motion-reduce:transition-none"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          {/* SR-only live region announcing current slide — hidden from view,
              but read by screen readers when paused for reduced-motion users. */}
          {reducedMotion && (
            <p className="sr-only" aria-live="polite">
              Showing testimonial {index + 1} of {TESTIMONIALS.length}: {current.name}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
