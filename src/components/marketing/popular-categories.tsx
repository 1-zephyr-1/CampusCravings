import Link from "next/link";
import {
  getCategoriesWithCounts,
  type CategoryWithCount,
} from "@/lib/categories";

/**
 * "Browse by category" section on the marketing landing page.
 *
 * Server component. Pulls the live category list (with item counts) from
 * the database via `getCategoriesWithCounts`; falls back to
 * DEFAULT_CATEGORIES (no counts) when the DB is unreachable.
 *
 * Truncated to 8 to keep the marketing layout tidy; the `/categories`
 * page shows the full grid with proper counts.
 */
const VISIBLE_COUNT = 8;

export async function PopularCategories() {
  const all = await getCategoriesWithCounts();
  const categories = all.slice(0, VISIBLE_COUNT);

  return (
    <section
      aria-labelledby="categories-heading"
      className="py-12 md:py-16 bg-[var(--background)]"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h2
              id="categories-heading"
              className="text-xl md:text-2xl font-bold text-[var(--text)]"
            >
              Browse by category
            </h2>
            <p className="text-sm md:text-base text-[var(--text-muted)] mt-1">
              Jump straight into what you&apos;re craving.
            </p>
          </div>
          <Link
            href="/categories"
            className="text-sm font-medium text-[var(--primary)] hover:underline shrink-0 hidden sm:inline"
          >
            View all →
          </Link>
        </div>

        <ul
          role="list"
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3"
          aria-label="Food categories"
        >
          {categories.map((cat) => (
            <CategoryCard key={cat.name} category={cat} />
          ))}
        </ul>

        {/* Mobile-only secondary CTA — the header link is hidden on small screens. */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/categories"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            View all categories →
          </Link>
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: CategoryWithCount }) {
  const Icon = category.icon;
  const ariaLabel = `Browse ${category.name}${
    category.itemCount > 0
      ? ` (${category.itemCount} item${category.itemCount === 1 ? "" : "s"})`
      : ""
  }`;
  return (
    <li>
      <Link
        href={`/feed?category=${encodeURIComponent(category.name)}`}
        className="group flex flex-col items-center justify-center gap-1.5 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)]/40 hover:shadow-md transition-all motion-reduce:transition-none"
        aria-label={ariaLabel}
      >
        <div
          className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center group-hover:bg-[var(--primary)]/15 transition-colors motion-reduce:transition-none"
          aria-hidden="true"
        >
          {category.emoji ? (
            <span className="text-xl leading-none">{category.emoji}</span>
          ) : (
            <Icon size={18} className="text-[var(--primary)]" />
          )}
        </div>
        <span className="text-xs font-semibold text-[var(--text)] truncate w-full text-center">
          {category.name}
        </span>
        {category.itemCount > 0 ? (
          <span className="text-[10px] text-[var(--text-muted)]">
            {category.itemCount} item{category.itemCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
