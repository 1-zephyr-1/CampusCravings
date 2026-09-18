"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useSupabase } from "@/lib/supabase/use-client";
import { SellerCard } from "@/components/feed/seller-card";
import { ItemCard } from "@/components/feed/item-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { ErrorState } from "@/components/ui/error-state";
import type { Store, FoodItem } from "@/types";

/**
 * Global search results page client island.
 *
 * Reads `?q=...` from the URL, runs two parallel Supabase queries (stores and
 * food items) matching the term against both name and description, and renders
 * two sections: Stores (top) and Items (bottom).
 */
export default function SearchClient() {
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const query = (searchParams.get("q") || "").trim();

  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Reset state when the query changes so the skeleton shows briefly
    // between searches.
    setLoading(true);
    setError(null);

    async function runSearch() {
      // Empty query: skip the round-trip and render the empty state.
      if (!query) {
        if (cancelled) return;
        setStores([]);
        setItems([]);
        setLoading(false);
        return;
      }

      // Escape percent signs / backslashes so the user's query can't be
      // interpreted as a wildcard by `ilike`.
      const safe = query.replace(/\\/g, "\\\\").replace(/%/g, "\\%");
      const pattern = `%${safe}%`;
      const orFilter = `name.ilike.${pattern},description.ilike.${pattern}`;

      const storesPromise = supabase
        .from("stores")
        .select(
          "*, profile:profiles!stores_user_id_fkey(full_name)"
        )
        .eq("is_approved", true)
        .or(orFilter)
        .order("rating", { ascending: false })
        .limit(24);

      const itemsPromise = supabase
        .from("food_items")
        .select(
          "*, store:stores!food_items_store_id_fkey(id, name, is_open, is_approved)"
        )
        .or(orFilter)
        .order("created_at", { ascending: false })
        .limit(24);

      const [{ data: storeData, error: storesError }, { data: itemData, error: itemsError }] =
        await Promise.all([storesPromise, itemsPromise]);

      if (cancelled) return;

      const failed = storesError || itemsError;
      if (failed) {
        const msg =
          failed.message ||
          "We couldn't run your search. Please try again in a moment.";
        setError(msg);
        setLoading(false);
        return;
      }

      // Filter out items whose parent store is closed / unapproved, matching
      // the rest of the app's visibility rules.
      const visibleItems = (itemData || []).filter(
        (it: FoodItem & { store?: { is_approved?: boolean; is_open?: boolean } }) =>
          it.store?.is_approved && it.store?.is_open
      );

      setStores(storeData || []);
      setItems(visibleItems);
      setLoading(false);
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [query, refetchToken, supabase]);

  const noResults =
    !loading && !error && query.length > 0 && stores.length === 0 && items.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      <SectionHeader
        title={
          query ? `Results for "${query}"` : "Search CampusCravings"
        }
        subtitle={
          query
            ? "Stores and items matching your search"
            : "Find a homemade meal or a student-run kitchen"
        }
        className="mb-5"
      />

      {!query ? (
        <EmptyState
          icon={Search}
          title="Start a search"
          message="Use the bar at the top to look for a store or a dish."
        />
      ) : loading ? (
        <SearchResultsSkeleton />
      ) : error ? (
        <ErrorState
          error={error}
          title="Couldn't run your search"
          onRetry={() => {
            setError(null);
            setLoading(true);
            setRefetchToken((t) => t + 1);
          }}
        />
      ) : noResults ? (
        <EmptyState
          icon={Search}
          title={`No results for "${query}"`}
          message="Try a different search term"
        />
      ) : (
        <>
          {stores.length > 0 && (
            <section aria-labelledby="search-stores-heading" className="mb-8">
              <h2
                id="search-stores-heading"
                className="text-sm md:text-base font-bold text-[var(--text)] mb-3"
              >
                Stores
                <span className="ml-2 text-xs font-medium text-[var(--text-muted)]">
                  ({stores.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {stores.map((store, idx) => (
                  <SellerCard
                    key={store.id}
                    store={store}
                    priority={idx === 0}
                  />
                ))}
              </div>
            </section>
          )}

          {items.length > 0 && (
            <section aria-labelledby="search-items-heading">
              <h2
                id="search-items-heading"
                className="text-sm md:text-base font-bold text-[var(--text)] mb-3"
              >
                Items
                <span className="ml-2 text-xs font-medium text-[var(--text-muted)]">
                  ({items.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((item, idx) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    priority={idx === 0}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Skeleton that mirrors the real layout: a Stores section followed by an
 * Items section, each rendered as a 3-up grid of card-shaped placeholders.
 */
function SearchResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading search results">
      <section className="mb-8">
        <Skeleton className="h-5 w-32 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
            >
              <Skeleton className="h-32" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Skeleton className="h-5 w-24 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
            >
              <Skeleton className="h-32" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
