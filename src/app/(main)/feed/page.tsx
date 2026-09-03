"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { useSearchParams, useRouter } from "next/navigation";
import { SellerCard } from "@/components/feed/seller-card";
import { ItemCard } from "@/components/feed/item-card";
import { CategoryChip } from "@/components/feed/category-chip";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Store, FoodItem, Category } from "@/types";

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 md:px-6 py-4"><div className="animate-pulse space-y-4">{[...Array(6)].map((_, i) => (<div key={i} className="bg-sand/30 dark:bg-[#3A2E20] rounded-xl h-48" />))}</div></div>}>
      <FeedContent />
    </Suspense>
  );
}

function FeedContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"sellers" | "items">("sellers");
  const [showSearch, setShowSearch] = useState(searchParams.get("search") === "true");

  // Price range filter
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch categories
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      setCategories(cats || []);

      // Fetch stores
      let storeQuery = supabase
        .from("stores")
        .select("*, profile:profiles!stores_user_id_fkey(full_name)")
        .eq("is_approved", true)
        .order("rating", { ascending: false });

      if (searchQuery) {
        storeQuery = storeQuery.ilike("name", `%${searchQuery}%`);
      }

      const { data: storeData } = await storeQuery;
      setStores(storeData || []);

      // Fetch items
      let itemQuery = supabase
        .from("food_items")
        .select("*, store:stores!food_items_store_id_fkey(id, name, is_open, is_approved)")
        .gte("price", priceRange[0])
        .lte("price", priceRange[1])
        .order("created_at", { ascending: false });

      if (searchQuery) {
        itemQuery = itemQuery.ilike("name", `%${searchQuery}%`);
      }

      if (selectedCategory) {
        const { data: itemIds } = await supabase
          .from("item_categories")
          .select("item_id")
          .eq("category_id", selectedCategory);

        if (itemIds && itemIds.length > 0) {
          itemQuery = itemQuery.in(
            "id",
            itemIds.map((ic) => ic.item_id)
          );
        } else {
          setItems([]);
          setLoading(false);
          return;
        }
      }

      const { data: itemData } = await itemQuery;
      setItems(
        (itemData || []).filter(
          (item: any) => item.store?.is_approved && item.store?.is_open
        )
      );
      setLoading(false);
    }

    fetchData();
  }, [searchQuery, selectedCategory, priceRange]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setShowSearch(false);
    router.push(`/feed?q=${encodeURIComponent(searchQuery)}`);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      {/* Search overlay - mobile */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-cream dark:bg-cream-dark sm:hidden">
          <div className="flex items-center gap-2 p-4 border-b border-sand dark:border-[#4A3D30]">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-bark"
                  size={16}
                />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search food, sellers..."
                  className="w-full pl-9 pr-4 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso dark:bg-surface-dark dark:border-[#4A3D30] dark:text-cream"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className="text-sm text-bark font-medium"
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
        className="sm:hidden w-full flex items-center gap-2 px-4 py-2.5 bg-surface border border-sand rounded-lg text-sm text-bark dark:bg-surface-dark dark:border-[#4A3D30] mb-4"
      >
        <Search size={16} />
        Search for food...
      </button>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <CategoryChip
          name="All"
          icon="🍽️"
          isActive={!selectedCategory}
          onClick={() => setSelectedCategory(null)}
        />
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            name={cat.name}
            icon={cat.icon}
            isActive={selectedCategory === cat.id}
            onClick={() =>
              setSelectedCategory(
                selectedCategory === cat.id ? null : cat.id
              )
            }
          />
        ))}
      </div>

      {/* View toggle + Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-surface dark:bg-surface-dark rounded-lg p-1 border border-sand dark:border-[#4A3D30]">
          <button
            onClick={() => setView("sellers")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === "sellers"
                ? "bg-tomato text-white"
                : "text-bark hover:text-espresso dark:hover:text-cream"
            }`}
          >
            Sellers
          </button>
          <button
            onClick={() => setView("items")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === "items"
                ? "bg-tomato text-white"
                : "text-bark hover:text-espresso dark:hover:text-cream"
            }`}
          >
            Items
          </button>
        </div>

        {view === "items" && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-bark border border-sand rounded-lg dark:border-[#4A3D30] dark:text-cream/70"
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
        )}
      </div>

      {/* Price filter */}
      {showFilters && view === "items" && (
        <div className="mb-4 p-3 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] animate-slide-up">
          <label className="text-xs font-medium text-bark dark:text-cream/70 mb-2 block">
            Price Range: ৳{priceRange[0]} — ৳{priceRange[1]}
          </label>
          <div className="flex gap-3 items-center">
            <input
              type="range"
              min={0}
              max={500}
              value={priceRange[0]}
              onChange={(e) =>
                setPriceRange([Math.min(Number(e.target.value), priceRange[1] - 10), priceRange[1]])
              }
              className="flex-1 accent-tomato"
            />
            <input
              type="range"
              min={0}
              max={500}
              value={priceRange[1]}
              onChange={(e) =>
                setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0] + 10)])
              }
              className="flex-1 accent-tomato"
            />
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] overflow-hidden animate-pulse"
            >
              <div className="h-32 bg-sand/30 dark:bg-[#3A2E20]" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-sand/30 dark:bg-[#3A2E20] rounded w-3/4" />
                <div className="h-3 bg-sand/30 dark:bg-[#3A2E20] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : view === "sellers" ? (
        stores.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stores.map((store) => (
              <SellerCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <EmptyState
            message={
              searchQuery
                ? `No sellers found for "${searchQuery}"`
                : "No sellers yet. Be the first to set up a shop!"
            }
          />
        )
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          message={
            searchQuery
              ? `No items found for "${searchQuery}"`
              : "No items available right now."
          }
        />
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <span className="text-4xl mb-3 block">🍽️</span>
      <p className="text-sm text-bark">{message}</p>
    </div>
  );
}
