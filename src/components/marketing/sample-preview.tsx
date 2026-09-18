import Image from "next/image";
import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import { getFeaturedItems, getPopularStores } from "@/lib/sample-queries";

/**
 * Server component — renders the "popular stores" + "fresh today" preview
 * on the marketing landing page. Uses anon-readable Supabase queries,
 * so this works for unauthenticated visitors.
 *
 * If the database returns nothing (no stores yet), the empty state is
 * shown so the layout doesn't collapse.
 */
export async function SamplePreview() {
  const [stores, items] = await Promise.all([
    getPopularStores(),
    getFeaturedItems(),
  ]);

  if (stores.length === 0 && items.length === 0) {
    return (
      <section className="py-12 bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Be the first seller on campus — sign up below to share your
            cooking with the BRACU community.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Popular stores */}
      {stores.length > 0 && (
        <section
          aria-labelledby="popular-stores-heading"
          className="py-12 md:py-16 bg-[var(--surface)] border-y border-[var(--border)]"
        >
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2
                  id="popular-stores-heading"
                  className="text-xl md:text-2xl font-bold text-[var(--text)]"
                >
                  Popular sellers on campus
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Top-rated kitchens from your fellow BRACU students.
                </p>
              </div>
              <Link
                href="/feed"
                className="text-sm font-medium text-[var(--primary)] hover:underline shrink-0 hidden sm:inline"
              >
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={`/feed/${store.id}`}
                  className="group block bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-md hover:border-[var(--primary)]/30 transition-all motion-reduce:transition-none"
                >
                  <div className="relative h-36 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)]">
                    {store.photo_url ? (
                      <Image
                        src={store.photo_url}
                        alt={store.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🍳
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-[var(--text)] truncate">
                      {store.name}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                      <MapPin size={11} aria-hidden="true" />
                      {store.pickup_area}
                    </p>
                    {store.rating > 0 && (
                      <div
                        className="flex items-center gap-1 mt-1.5"
                        aria-label={`Rated ${store.rating.toFixed(1)} out of 5`}
                      >
                        <Star
                          size={12}
                          className="fill-amber-500 text-amber-500"
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium text-[var(--text)]">
                          {store.rating.toFixed(1)}
                        </span>
                        {store.total_ratings > 0 && (
                          <span className="text-xs text-[var(--text-muted)]">
                            ({store.total_ratings})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured dishes */}
      {items.length > 0 && (
        <section
          aria-labelledby="featured-dishes-heading"
          className="py-12 md:py-16"
        >
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2
                  id="featured-dishes-heading"
                  className="text-xl md:text-2xl font-bold text-[var(--text)]"
                >
                  Fresh today
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Latest dishes posted by sellers — order while they&apos;re hot.
                </p>
              </div>
              <Link
                href="/feed"
                className="text-sm font-medium text-[var(--primary)] hover:underline shrink-0 hidden sm:inline"
              >
                Browse all →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="block bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
                >
                  <div className="relative h-32 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)]">
                    {item.photo_urls?.[0] ? (
                      <Image
                        src={item.photo_urls[0]}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🍽️
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-[var(--text)] truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                      {item.store_name}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold font-mono text-[var(--primary)]">
                        ৳{item.price.toFixed(0)}
                      </span>
                      {item.dietary_tags?.length > 0 && (
                        <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[8rem]">
                          {item.dietary_tags.slice(0, 2).join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
