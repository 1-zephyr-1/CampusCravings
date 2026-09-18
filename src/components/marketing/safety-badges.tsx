import { ShieldCheck, Banknote, MessageCircle } from "lucide-react";

/**
 * Trust badges rendered on the marketing landing page.
 * Server component — no client state, no realtime.
 *
 * Communicates the three safety / trust pillars of the platform:
 *   - BRACU verified identity
 *   - Cash on pickup (no pre-payment risk)
 *   - Direct chat with seller
 */
const BADGES = [
  {
    icon: ShieldCheck,
    title: "BRACU verified",
    subtitle: "Every seller signs in with their @g.bracu.ac.bd email.",
  },
  {
    icon: Banknote,
    title: "Cash on pickup",
    subtitle: "You only pay when you collect — no pre-payment, no fees.",
  },
  {
    icon: MessageCircle,
    title: "Direct chat with seller",
    subtitle: "Message the cook to confirm pickup time, allergies, or swaps.",
  },
] as const;

export function SafetyBadges() {
  return (
    <section
      aria-labelledby="safety-heading"
      className="py-12 md:py-16 bg-[var(--background)]"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <h2
          id="safety-heading"
          className="text-xl md:text-2xl font-bold text-[var(--text)] text-center mb-2"
        >
          Safe by design
        </h2>
        <p className="text-sm md:text-base text-[var(--text-muted)] text-center max-w-2xl mx-auto mb-10">
          Built for BRACU students, with safeguards that keep every order simple
          and low-risk.
        </p>
        <ul
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          role="list"
        >
          {BADGES.map((badge) => (
            <li
              key={badge.title}
              className="flex flex-col items-start p-5 bg-[var(--surface)] rounded-2xl border border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors motion-reduce:transition-none"
            >
              <div
                aria-hidden="true"
                className="w-12 h-12 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center mb-3"
              >
                <badge.icon size={22} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {badge.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                {badge.subtitle}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
