import type { Metadata } from "next";
import Link from "next/link";
import { ChefHat } from "lucide-react";
import {
  getCategoriesWithCounts,
  type CategoryWithCount,
} from "@/lib/categories";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Categories · CampusCravings",
  description:
    "Browse homemade food on the BRAC University campus by category — rice, snacks, desserts, drinks, and more. Find exactly what you're craving.",
  alternates: { canonical: "/categories" },
  openGraph: {
    title: "Categories · CampusCravings",
    description:
      "Browse homemade food on the BRAC University campus by category.",
    type: "website",
    url: "/categories",
    siteName: "CampusCravings",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "CampusCravings food categories",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Categories · CampusCravings",
    description: "Browse food by category on the BRAC University campus.",
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true },
};

/**
 * Server-rendered categories browse page. Each card links to
 * `/feed?category=<name>` — the feed client resolves the name back to a
 * `category_id` and preselects the Items view.
 *
 * On DB failure we fall back to DEFAULT_CATEGORIES (no counts). If both
 * the DB and the fallback list are empty we show an EmptyState.
 */
export default async function CategoriesPage() {
  const items = await getCategoriesWithCounts();

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <SectionHeader
          title="Browse by category"
          subtitle="Find what you're craving on campus"
        />
        <EmptyState
          icon={ChefHat}
          title="Categories coming soon"
          message="We're still setting up categories. Check back in a bit, or browse the feed to see what's cooking right now."
          ctaLabel="Browse the feed"
          ctaHref="/feed"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <SectionHeader
        title="Browse by category"
        subtitle="Find exactly what you're craving on campus"
      />

      <ul
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
        aria-label="Food categories"
      >
        {items.map((cat) => (
          <CategoryCard key={cat.name} category={cat} />
        ))}
      </ul>
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryWithCount }) {
  const Icon = category.icon;
  const countLabel =
    category.itemCount > 0
      ? `${category.itemCount} item${category.itemCount === 1 ? "" : "s"}`
      : "Browse";
  const ariaLabel = `Browse ${category.name}${
    category.itemCount > 0
      ? ` (${category.itemCount} item${category.itemCount === 1 ? "" : "s"})`
      : ""
  }`;

  return (
    <li>
      <Link
        href={`/feed?category=${encodeURIComponent(category.name)}`}
        className="group flex flex-col items-center justify-center gap-2 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)]/40 hover:shadow-md transition-all motion-reduce:transition-none aspect-square"
        aria-label={ariaLabel}
      >
        <div
          className="w-12 h-12 rounded-full bg-[var(--primary-soft)] flex items-center justify-center group-hover:bg-[var(--primary)]/15 transition-colors motion-reduce:transition-none"
          aria-hidden="true"
        >
          {category.emoji ? (
            <span className="text-2xl leading-none">{category.emoji}</span>
          ) : (
            <Icon size={22} className="text-[var(--primary)]" />
          )}
        </div>
        <span className="text-sm font-semibold text-[var(--text)] text-center truncate w-full">
          {category.name}
        </span>
        <span className="text-xs text-[var(--text-muted)]">{countLabel}</span>
      </Link>
    </li>
  );
}
