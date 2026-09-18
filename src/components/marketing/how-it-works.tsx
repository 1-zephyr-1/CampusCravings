import { Search, ShoppingBag, Utensils } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "1. Browse",
    body: "Find a dish by category, dietary tag, or seller. Filter by price and rating.",
  },
  {
    icon: ShoppingBag,
    title: "2. Pre-order",
    body: "Add to your cart, choose a pickup time, and send the order. The seller is notified instantly.",
  },
  {
    icon: Utensils,
    title: "3. Pick up & enjoy",
    body: "Show up at the pickup spot, pay in cash (or as the seller prefers), and enjoy fresh homemade food.",
  },
];

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="py-12 md:py-16 bg-[var(--surface)] border-y border-[var(--border)]"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <h2
          id="how-it-works-heading"
          className="text-xl md:text-2xl font-bold text-[var(--text)] text-center mb-10"
        >
          How CampusCravings works
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list">
          {STEPS.map((step) => (
            <li
              key={step.title}
              className="flex flex-col items-center text-center p-6 bg-[var(--background)] rounded-2xl border border-[var(--border)]"
            >
              <div
                aria-hidden="true"
                className="w-14 h-14 rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center mb-4"
              >
                <step.icon size={26} />
              </div>
              <h3 className="text-base font-semibold text-[var(--text)]">
                {step.title}
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}