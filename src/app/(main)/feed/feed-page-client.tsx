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
import { Search, SlidersHorizontal, Utensils, ChefHat } from "lucide-react";
import { Store, FoodItem, Category } from "@/types";
import { Pagination } from "@/components/ui/pagination";
import { DIETARY_TAGS } from "@/lib/constants";

const PAGE_SIZE = 20;

export default function FeedClient() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/3" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <FeedContent />
    </Suspense>
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
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || ""
  );
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"sellers" | "items">("sellers");
  const [showSearch, setShowSearch] = useState(
    searchParams.get("search") === "true"
  );
  const [page, setPage] = useState(1);
  const [totalStores, setTotalStores] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("newest");

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

  // The big one: parallelize EVERY independent fetch with Promise.all so
  // round-trip latency is `max(t1, t2, …)` instead of `sum(t1, t2, …)`.
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);

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
      const itemIdsPromise: Promise<{ data: { item_id: string }[] | null }> =
        selectedCategory
          ? Promise.resolve(
              supabase
                .from("item_categories")
                .select("item_id")
                .eq("category_id", selectedCategory)
            ).then((r) => ({ data: r.data as { item_id: string }[] | null }))
          : Promise.resolve({ data: null });

      // Build the items query *now* (it's a builder, not yet executed).
      let itemQuery = supabase
        .from("food_items")
        .select(
          "*, store:stores!food_items_store_id_fkey(id, name, is_open, is_approved)",
          { count: "exact" }
        )
        .gte("price", debouncedPriceRange[0])
        .lte("price", debouncedPriceRange[1]);

      if (searchQuery) {
        itemQuery = itemQuery.ilike("name", `%${searchQuery}%`);
      }

      // 3a. Sort.
      switch (sortKey) {
        case "price_asc":
          itemQuery = itemQuery.order("price", { ascending: true });
          break;
        case "price_desc":
          itemQuery = itemQuery.order("price", { ascending: false });
          break;
        case "rating":
          itemQuery = itemQuery.order("created_at", { ascending: false });
          break;
        case "newest":
        default:
          itemQuery = itemQuery.order("created_at", { ascending: false });
          break;
      }

      const itemsPromise = itemQuery.range(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE - 1
      );

      // Kick off all three in parallel.
      const [
        { data: cats },
        { data: storeData, count: storeCount },
        { data: itemIds },
        { data: itemData, count: itemCount },
      ] = await Promise.all([
        categoriesPromise,
        storesPromise,
        itemIdsPromise,
        itemsPromise,
      ]);

      if (cancelled) return;
      setCategories(cats || []);
      setStores(storeData || []);
      setTotalStores(storeCount || 0);

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

      // Filter by dietary tags (OR within selection).
      if (dietary.length > 0) {
        filteredItems = filteredItems.filter((it) =>
          dietary.every((d) => it.dietary_tags?.includes(d))
        );
      }

      setItems(filteredItems);
      setTotalItems(itemCount || 0);
      setLoading(false);
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [
    searchQuery,
    selectedCategory,
    debouncedPriceRange,
    page,
    sortKey,
    dietary,
  ]);

  const totalPages = useMemo(
    () =>
      Math.max(1, Math.ceil((view === "sellers" ? totalStores : totalItems) / PAGE_SIZE)),
    [totalStores, totalItems, view]
  );

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
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      <SectionHeader
        title="What's cooking on campus"
        subtitle="Browse food from your fellow BRACU students"
        className="mb-5"
      />

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
        className="sm:hidden w-full flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)] mb-4 hover:border-[var(--primary)]/40 transition-colors"
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
          className="mb-4 p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] space-y-4 animate-slide-up"
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
              </div>
            </div>
          ))}
        </div>
      ) : view === "sellers" ? (
        stores.length > 0 ? (
          <>
            <div
              id="view-sellers-panel"
              role="tabpanel"
              aria-labelledby="view-sellers-tab"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
            >
              {stores.map((store) => (
                <SellerCard key={store.id} store={store} />
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
      ) : items.length > 0 ? (
        <>
          <div
            id="view-items-panel"
            role="tabpanel"
            aria-labelledby="view-items-tab"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
          >
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
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
