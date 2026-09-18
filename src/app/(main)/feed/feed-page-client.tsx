"use client";

import {
  Suspense,
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useSearchParams, useRouter } from "next/navigation";
import { SellerCard } from "@/components/feed/seller-card";
import { ItemCard } from "@/components/feed/item-card";
import { CategoryChip } from "@/components/feed/category-chip";
import { FilterChip } from "@/components/ui/filter-chip";
import { SortControl, type SortKey } from "@/components/feed/sort-control";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { OnboardingTour } from "@/components/ui/onboarding-tour";
import {
  Search,
  SlidersHorizontal,
  Utensils,
  ChefHat,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Store, FoodItem, Category } from "@/types";
import { Pagination } from "@/components/ui/pagination";
import { RecentlyViewed } from "@/components/feed/recently-viewed";
import { readDietaryPrefs } from "@/lib/recently-viewed";
import { DIETARY_TAGS } from "@/lib/constants";
import { ErrorState } from "@/components/ui/error-state";
import { ErrorBoundary } from "@/components/dev/error-boundary";

const PAGE_SIZE = 20;
const STALE_AFTER_MS = 5 * 60 * 1000; // 5 minutes

export default function FeedClient() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
            {/* Section title placeholder */}
            <div className="mb-5 space-y-2">
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            {/* Category chips placeholder */}
            <div className="flex gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-7 w-20" shape="pill" />
              ))}
            </div>
            {/* Card grid matching ItemCard/SellerCard layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
                >
                  <Skeleton className="h-32" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-12" shape="pill" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      >
        <FeedContent />
        <OnboardingTour />
      </Suspense>
    </ErrorBoundary>
  );
}

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useSupabase();

  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dietary, setDietary] = useState<string[]>([]);
  // User's saved dietary preferences from localStorage. Toggling the
  // "Recommended for you" filter applies them to the items query.
  const [savedDietaryPrefs, setSavedDietaryPrefs] = useState<string[]>([]);
  const [recommendedOn, setRecommendedOn] = useState(false);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || ""
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"sellers" | "items">("sellers");
  const [showSearch, setShowSearch] = useState(
    searchParams.get("search") === "true"
  );
  const [page, setPage] = useState(1);
  const [totalStores, setTotalStores] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("recommended");
  // Bumped to manually re-run the data fetch (e.g. from the "Try again" button).
  const [refetchToken, setRefetchToken] = useState(0);

  // Last successful fetch timestamp — drives the "Updated Xm ago" pill
  // and the stale-data warning.
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Price range filter with debounce
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [debouncedPriceRange, setDebouncedPriceRange] = useState<
    [number, number]
  >([0, 500]);
  const [showFilters, setShowFilters] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close mobile search overlay with Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSearch(false);
    };
    if (showSearch) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showSearch]);

  // Hydrate saved dietary preferences once on mount. We can't read
  // localStorage at render time without causing hydration mismatches.
  useEffect(() => {
    setSavedDietaryPrefs(readDietaryPrefs());
  }, []);

  // Debounce price-range changes so we don't refetch on every slider tick.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedPriceRange(priceRange);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [priceRange]);

  // Re-render once a minute so the staleness label updates as time passes.
  // (The label itself reads Date.now(), but the component needs to actually
  // re-render for the new relative time to appear.)
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // The big one: parallelize EVERY independent fetch with Promise.all so
  // round-trip latency is `max(t1, t2, …)` instead of `sum(t1, t2, …)`.
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setError(null);

      // 1. Categories (always needed).
      const categoriesPromise = supabase
        .from("categories")
        .select("*")
        .order("name");

      // 2. Stores query (parallel).
      let storeQuery = supabase
        .from("stores")
        .select("*, profile:profiles!stores_user_id_fkey(full_name)", {
          count: "exact",
        })
        .eq("is_approved", true)
        .order("rating", { ascending: false });

      if (searchQuery) {
        storeQuery = storeQuery.ilike("name", `%${searchQuery}%`);
      }
      const storesPromise = storeQuery.range(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE - 1
      );

      // 3. Items query — fan out to (a) item_ids by category + (b) items list,
      // both running in parallel; the category branch short-circuits if no
      // category is selected.
      const itemIdsPromise: Promise<{
        data: { item_id: string }[] | null;
        error: unknown;
      }> =
        selectedCategory
          ? (supabase
              .from("item_categories")
              .select("item_id")
              .eq("category_id", selectedCategory) as unknown as Promise<{
              data: { item_id: string }[] | null;
              error: unknown;
            }>)
          : (Promise.resolve({ data: null, error: null }) as Promise<{
              data: { item_id: string }[] | null;
              error: unknown;
            }>);

      // Build the items query *now* (it's a builder, not yet executed).
      // Server-side ordering is intentionally fixed at `created_at desc` so
      // pagination is stable across sort changes; the user-selected sort
      // (recommended / price / rating) is applied client-side below.
      let itemQuery = supabase
        .from("food_items")
        .select(
          "*, store:stores!food_items_store_id_fkey(id, name, is_open, is_approved)",
          { count: "exact" }
        )
        .gte("price", debouncedPriceRange[0])
        .lte("price", debouncedPriceRange[1])
        .order("created_at", { ascending: false });

      if (searchQuery) {
        itemQuery = itemQuery.ilike("name", `%${searchQuery}%`);
      }

      const itemsPromise = itemQuery.range(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE - 1
      );

      // Kick off all three in parallel.
      const [
        { data: cats, error: catsError },
        { data: storeData, count: storeCount, error: storesError },
        { data: itemIds, error: itemIdsError },
        { data: itemData, count: itemCount, error: itemsError },
      ] = await Promise.all([
        categoriesPromise,
        storesPromise,
        itemIdsPromise,
        itemsPromise,
      ]);

      const failed: { message?: string } | null =
        catsError || storesError || itemIdsError || itemsError;
      if (cancelled) return;
      if (failed) {
        const msg =
          failed.message ||
          "We couldn't load the feed. Please try again in a moment.";
        setError(msg);
        setLoading(false);
        return;
      }
      setCategories(cats || []);
      setStores(storeData || []);
      setTotalStores(storeCount || 0);

      // If the URL has `?category=<name>` (e.g. from the categories browse
      // page), resolve it to the matching category_id once we know the list.
      // Without this the deep-link would silently no-op.
      const requestedCategoryName = searchParams.get("category");
      if (requestedCategoryName && cats && cats.length > 0) {
        const match = cats.find(
          (c) => c.name.toLowerCase() === requestedCategoryName.toLowerCase()
        );
        if (match) {
          setSelectedCategory((current) =>
            current === match.id ? current : match.id
          );
          // Items are the relevant view when a category is preselected.
          setView("items");
        }
      }

      // Apply dietary filter client-side (small list, faster than a join).
      let filteredItems = (itemData || []).filter(
        (it: FoodItem & { store?: { is_approved?: boolean; is_open?: boolean } }) =>
          it.store?.is_approved && it.store?.is_open
      );

      // Filter by category via the item_ids lookup if selected.
      if (selectedCategory && itemIds && itemIds.length > 0) {
        const idSet = new Set(itemIds.map((ic) => ic.item_id));
        filteredItems = filteredItems.filter((it) => idSet.has(it.id));
      } else if (selectedCategory && (!itemIds || itemIds.length === 0)) {
        filteredItems = [];
      }

      // Filter by dietary tags. When "Recommended for you" is on, union
      // the manual selection with the user's saved prefs from localStorage
      // so the feed pre-filters for their diet.
      const effectiveDietary = recommendedOn
        ? Array.from(new Set([...dietary, ...savedDietaryPrefs]))
        : dietary;
      if (effectiveDietary.length > 0) {
        filteredItems = filteredItems.filter((it) =>
          effectiveDietary.every((d) => it.dietary_tags?.includes(d))
        );
      }

      setItems(filteredItems);
      setTotalItems(itemCount || 0);
      setLoading(false);
      setLastFetchedAt(Date.now());
      setRefreshing(false);
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    searchQuery,
    selectedCategory,
    debouncedPriceRange,
    page,
    dietary,
    recommendedOn,
    savedDietaryPrefs,
    refetchToken,
    supabase,
  ]);

  // Apply client-side sort based on the user's selection. Server returns
  // `created_at desc`, so for "newest" we can skip the work.
  const sortedItems = useMemo(() => {
    if (sortKey === "newest" || items.length === 0) return items;
    const copy = [...items];
    switch (sortKey) {
      case "price_asc":
        return copy.sort((a, b) => a.price - b.price);
      case "price_desc":
        return copy.sort((a, b) => b.price - a.price);
      case "rating":
        return copy.sort((a, b) => {
          const ra = a.average_rating ?? 0;
          const rb = b.average_rating ?? 0;
          if (rb !== ra) return rb - ra;
          // Stable tiebreaker: items with more ratings win, then newer.
          const na = a.total_ratings ?? 0;
          const nb = b.total_ratings ?? 0;
          if (nb !== na) return nb - na;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
      case "recommended":
      default:
        // "Recommended": rating × log(review_count) (a soft Bayesian-ish
        // score) with recency as a tiebreaker.
        return copy.sort((a, b) => {
          const ra = a.average_rating ?? 0;
          const rb = b.average_rating ?? 0;
          const na = a.total_ratings ?? 0;
          const nb = b.total_ratings ?? 0;
          const scoreA = ra * Math.log2(na + 2);
          const scoreB = rb * Math.log2(nb + 2);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
    }
  }, [items, sortKey]);

  // True when every saved dietary preference is satisfied by the item.
  const matchesDietForItem = useCallback(
    (it: FoodItem) => {
      if (savedDietaryPrefs.length === 0) return false;
      return savedDietaryPrefs.every((d) => it.dietary_tags?.includes(d));
    },
    [savedDietaryPrefs]
  );

  // Manual refresh: bump the refetch token and show a spinner until the
  // fetch settles (the fetch effect resets `refreshing` on completion).
  const handleRefresh = useCallback(() => {
    if (loading || refreshing) return;
    setRefreshing(true);
    setRefetchToken((t) => t + 1);
  }, [loading, refreshing]);

  // Pull-to-refresh on mobile: track a downward drag at the top of the page
  // and trigger `handleRefresh` once the user releases past a threshold.
  const touchStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (typeof window !== "undefined" && window.scrollY <= 0) {
      touchStartYRef.current = e.touches[0].clientY;
      pullDistanceRef.current = 0;
    } else {
      touchStartYRef.current = null;
    }
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartYRef.current == null) return;
    const dy = e.touches[0].clientY - touchStartYRef.current;
    if (dy > 0) pullDistanceRef.current = dy;
  }, []);
  const onTouchEnd = useCallback(() => {
    if (
      touchStartYRef.current != null &&
      pullDistanceRef.current > 80 &&
      !refreshing &&
      !loading
    ) {
      handleRefresh();
    }
    touchStartYRef.current = null;
    pullDistanceRef.current = 0;
  }, [handleRefresh, refreshing, loading]);

  // Stale data: anything older than 5 minutes triggers the warning style.
  const isStale =
    lastFetchedAt != null && Date.now() - lastFetchedAt > STALE_AFTER_MS;

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setShowSearch(false);
      setPage(1);
      router.push(`/feed?q=${encodeURIComponent(searchQuery)}`);
    },
    [router, searchQuery]
  );

  return (
    <div
      className="max-w-5xl mx-auto px-4 md:px-6 py-4"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <SectionHeader
        title="What's cooking on campus"
        subtitle="Browse food from your fellow BRACU students"
        className="mb-5"
      />

      <RecentlyViewed />

      {/* Stale-data indicator + manual refresh */}
      {lastFetchedAt != null && (
        <div className="flex items-center justify-between mb-4 text-xs">
          <span
            className={
              isStale
                ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--warning-soft)] text-[var(--warning)] font-medium"
                : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]"
            }
            aria-live="polite"
          >
            <Clock size={12} aria-hidden="true" />
            Updated {formatRelativeTime(lastFetchedAt)}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-[var(--border)] transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh feed"
          >
            <RefreshCw
              size={12}
              aria-hidden="true"
              className={refreshing ? "animate-spin motion-reduce:animate-none" : ""}
            />
            Refresh
          </button>
        </div>
      )}

      {/* Mobile search overlay */}
      {showSearch && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search food"
          className="fixed inset-0 z-50 bg-[var(--background)] sm:hidden"
        >
          <div className="flex items-center gap-2 p-4 border-b border-[var(--border)]">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <label htmlFor="mobile-search" className="sr-only">
                  Search food and sellers
                </label>
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  size={16}
                  aria-hidden="true"
                />
                <input
                  id="mobile-search"
                  autoFocus
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search food, sellers..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className="text-sm text-[var(--text-muted)] font-medium px-2"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile search trigger */}
      <button
        onClick={() => setShowSearch(true)}
        className="sm:hidden w-full flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)] mb-4 hover:border-[var(--primary)]/40 transition-colors motion-reduce:transition-none"
        aria-label="Open search"
      >
        <Search size={16} aria-hidden="true" />
        Search for food...
      </button>

      {/* Category chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 md:mx-0 md:px-0"
        role="toolbar"
        aria-label="Category filters"
      >
        <CategoryChip
          name="All"
          icon="🍽️"
          isActive={!selectedCategory}
          onClick={() => {
            setSelectedCategory(null);
            setPage(1);
          }}
        />
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            name={cat.name}
            icon={cat.icon}
            isActive={selectedCategory === cat.id}
            onClick={() => {
              setSelectedCategory(selectedCategory === cat.id ? null : cat.id);
              setPage(1);
            }}
          />
        ))}
      </div>

      {/* View toggle + Filters/Sort */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div
          role="tablist"
          aria-label="Browse as"
          className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)]"
        >
          <button
            role="tab"
            id="view-sellers-tab"
            aria-selected={view === "sellers"}
            aria-controls="view-sellers-panel"
            tabIndex={view === "sellers" ? 0 : -1}
            onClick={() => setView("sellers")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors motion-reduce:transition-none ${
              view === "sellers"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Sellers
          </button>
          <button
            role="tab"
            id="view-items-tab"
            aria-selected={view === "items"}
            aria-controls="view-items-panel"
            tabIndex={view === "items" ? 0 : -1}
            onClick={() => setView("items")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors motion-reduce:transition-none ${
              view === "items"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Items
          </button>
        </div>

        <div className="flex items-center gap-2">
          {view === "items" && (
            <SortControl value={sortKey} onChange={setSortKey} />
          )}
          {view === "items" && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="filters-panel"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)]/40 hover:text-[var(--text)] transition-colors motion-reduce:transition-none"
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              Filters
            </button>
          )}
        </div>
      </div>

      {/* Filters panel (price + dietary) */}
      {showFilters && view === "items" && (
        <div
          id="filters-panel"
          className="mb-4 p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] space-y-4 animate-slide-up motion-reduce:animate-none"
        >
          <div>
            <span className="text-xs font-medium text-[var(--text-muted)] mb-2 block">
              Price range: ৳{priceRange[0]} – ৳{priceRange[1]}
            </span>
            <div className="flex gap-3 items-center">
              <label htmlFor="price-min" className="sr-only">
                Minimum price
              </label>
              <input
                id="price-min"
                type="range"
                min={0}
                max={500}
                value={priceRange[0]}
                onChange={(e) =>
                  setPriceRange([
                    Math.min(Number(e.target.value), priceRange[1] - 10),
                    priceRange[1],
                  ])
                }
                className="flex-1 accent-[var(--primary)]"
              />
              <label htmlFor="price-max" className="sr-only">
                Maximum price
              </label>
              <input
                id="price-max"
                type="range"
                min={0}
                max={500}
                value={priceRange[1]}
                onChange={(e) =>
                  setPriceRange([
                    priceRange[0],
                    Math.max(Number(e.target.value), priceRange[0] + 10),
                  ])
                }
                className="flex-1 accent-[var(--primary)]"
              />
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-[var(--text-muted)] mb-2 block">
              Dietary tags
            </span>
            {savedDietaryPrefs.length > 0 && (
              <div className="mb-2">
                <FilterChip
                  label={`Recommended for you (${savedDietaryPrefs.length})`}
                  isActive={recommendedOn}
                  onClick={() => {
                    setRecommendedOn((prev) => !prev);
                    setPage(1);
                  }}
                />
              </div>
            )}
            <div
              role="group"
              aria-label="Dietary filter"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {DIETARY_TAGS.map((tag) => (
                <FilterChip
                  key={tag}
                  label={tag}
                  isActive={dietary.includes(tag)}
                  onClick={() => {
                    setDietary((prev) =>
                      prev.includes(tag)
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]
                    );
                    setPage(1);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
          aria-busy="true"
          aria-label="Loading results"
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
            >
              <Skeleton className="h-32" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-12" shape="pill" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          error={error}
          title="Couldn't load the feed"
          onRetry={() => {
            // Re-run the fetch by bumping the refetch token.
            setError(null);
            setLoading(true);
            setRefetchToken((t) => t + 1);
          }}
        />
      ) : view === "sellers" ? (
        stores.length > 0 ? (
          <>
            <div
              id="view-sellers-panel"
              role="tabpanel"
              aria-labelledby="view-sellers-tab"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
            >
              {stores.map((store, idx) => (
                <SellerCard
                  key={store.id}
                  store={store}
                  priority={idx === 0}
                />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={Math.ceil(totalStores / PAGE_SIZE)}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={ChefHat}
            title="No sellers yet"
            message={
              searchQuery
                ? `No sellers match "${searchQuery}". Try a different term.`
                : "Be the first to set up a shop on campus — sign in and pick 'Seller' to start cooking for your peers."
            }
            ctaLabel="Sign in to start selling"
            ctaHref="/"
          />
        )
      ) : sortedItems.length > 0 ? (
        <>
          <div
            id="view-items-panel"
            role="tabpanel"
            aria-labelledby="view-items-tab"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
          >
            {sortedItems.map((item, idx) => (
              <ItemCard
                key={item.id}
                item={item}
                priority={idx === 0}
                matchesDiet={matchesDietForItem(item)}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={Math.ceil(totalItems / PAGE_SIZE)}
            onPageChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          icon={Utensils}
          title="Nothing cooking right now"
          message={
            searchQuery
              ? `No items match "${searchQuery}".`
              : "Check back around lunch or dinner — that's when sellers usually post."
          }
          ctaLabel="Browse sellers"
          ctaHref="/feed?view=sellers"
        />
      )}
    </div>
  );
}

/**
 * Compact "just now / Xm ago / Xh ago" string for the staleness pill.
 * Re-renders are driven by a 1-minute interval elsewhere in the component.
 */
function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(ts).toLocaleDateString();
}
