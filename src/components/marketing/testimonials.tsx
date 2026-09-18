import { Quote } from "lucide-react";

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

export function Testimonials() {
  return (
    <section
      aria-labelledby="testimonials-heading"
      className="py-12 md:py-16"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <h2
          id="testimonials-heading"
          className="text-xl md:text-2xl font-bold text-[var(--text)] text-center mb-8"
        >
          What students say
        </h2>
        <ul
          role="list"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {TESTIMONIALS.map((t) => (
            <li
              key={t.name}
              className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl"
            >
              <Quote
                size={20}
                className="text-[var(--primary)] mb-3"
                aria-hidden="true"
              />
              <p className="text-sm text-[var(--text)] leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-4">
                <span className="font-semibold text-[var(--text)]">
                  {t.name}
                </span>{" "}
                · {t.year}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}