"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Favorite, FoodItem, Store } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { FilterChip } from "@/components/ui/filter-chip";
import { toast } from "@/components/ui/toast";
import { DIETARY_TAGS } from "@/lib/constants";
import {
  ArrowUpDown,
  ChevronLeft,
  Heart,
  MapPin,
  Star,
  Trash2,
  Utensils,
  Store as StoreIcon,
} from "lucide-react";

interface FavoriteWithItem extends Favorite {
  item?: FoodItem;
  store?: Store;
}

type SortKey = "recent" | "price_asc" | "price_desc" | "rating";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently added" },
  { value: "price_asc", label: "Price low-high" },
  { value: "price_desc", label: "Price high-low" },
  { value: "rating", label: "Top rated" },
];

const FILTER_OPTIONS = ["All", ...DIETARY_TAGS, "Spicy"] as const;
type FilterTag = (typeof FILTER_OPTIONS)[number];

function favoriteKey(fav: FavoriteWithItem) {
  return `${fav.user_id}:${fav.item_id ?? ""}:${fav.store_id ?? ""}`;
}

function matchesDietaryFilter(
  fav: FavoriteWithItem,
  filter: FilterTag
): boolean {
  if (filter === "All") return true;

  if (filter === "Spicy") {
    // Spicy = spice_level >= 2 in our constant mapping (Spicy / Very Spicy)
    if (fav.item && typeof fav.item.spice_level === "number") {
      return fav.item.spice_level >= 2;
    }
    // Spiciness doesn't apply to plain store favorites
    return false;
  }

  // Dietary tag must be present on the item's dietary_tags array.
  if (fav.item && Array.isArray(fav.item.dietary_tags)) {
    return fav.item.dietary_tags.includes(filter);
  }
  return false;
}

export default function FavoritesPage() {
  const { profile } = useAuth();
  const supabase = useSupabase();

  const [favorites, setFavorites] = useState<FavoriteWithItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<FilterTag>("All");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  // Keys (user_id:item_id:store_id) of favorites selected for bulk removal.
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkRemoving, setBulkRemoving] = useState(false);

  useEffect(() => {
    if (!profile) return;

    async function fetchFavorites() {
      const { data: favs } = await supabase
        .from("favorites")
        .select(
          "*, item:food_items!favorites_item_id_fkey(*, store:stores!food_items_store_id_fkey(id, name, is_open)), store:stores!favorites_store_id_fkey(*, profile:profiles!stores_user_id_fkey(full_name))"
        )
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false });

      setFavorites((favs as FavoriteWithItem[]) || []);
      setLoading(false);
    }

    fetchFavorites();
  }, [profile, supabase]);

  const filteredFavorites = useMemo(() => {
    if (activeFilter === "All") return favorites;
    return favorites.filter((f) => matchesDietaryFilter(f, activeFilter));
  }, [favorites, activeFilter]);

  const sortedFavorites = useMemo(() => {
    const list = [...filteredFavorites];
    list.sort((a, b) => {
      switch (sortKey) {
        case "price_asc": {
          const pa = a.item?.price ?? Number.POSITIVE_INFINITY;
          const pb = b.item?.price ?? Number.POSITIVE_INFINITY;
          return pa - pb;
        }
        case "price_desc": {
          const pa = a.item?.price ?? -1;
          const pb = b.item?.price ?? -1;
          return pb - pa;
        }
        case "rating": {
          const ra = a.item?.average_rating ?? a.store?.rating ?? 0;
          const rb = b.item?.average_rating ?? b.store?.rating ?? 0;
          return rb - ra;
        }
        case "recent":
        default: {
          const ta = new Date(a.created_at).getTime();
          const tb = new Date(b.created_at).getTime();
          return tb - ta;
        }
      }
    });
    return list;
  }, [filteredFavorites, sortKey]);

  // Drop any stale selections if the underlying favorites list changes.
  useEffect(() => {
    if (selectedKeys.size === 0) return;
    const valid = new Set<string>();
    const live = new Set(favorites.map(favoriteKey));
    selectedKeys.forEach((k) => {
      if (live.has(k)) valid.add(k);
    });
    if (valid.size !== selectedKeys.size) setSelectedKeys(valid);
  }, [favorites, selectedKeys]);

  async function handleUnfavorite(fav: FavoriteWithItem) {
    if (!profile) return;

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", profile.id)
      .eq("item_id", fav.item_id)
      .eq("store_id", fav.store_id);

    if (!error) {
      setFavorites((prev) =>
        prev.filter(
          (f) => !(f.item_id === fav.item_id && f.store_id === fav.store_id)
        )
      );
    }
  }

  function toggleSelected(fav: FavoriteWithItem) {
    const key = favoriteKey(fav);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  async function handleBulkRemove() {
    if (!profile || selectedKeys.size === 0) return;

    const toRemove = favorites.filter((f) => selectedKeys.has(favoriteKey(f)));
    setBulkRemoving(true);

    // Supabase doesn't support multi-key OR deletes against composite keys
    // cleanly, so we issue one delete per row. RLS scopes by user_id.
    const results = await Promise.all(
      toRemove.map((fav) =>
        supabase
          .from("favorites")
          .delete()
          .eq("user_id", profile.id)
          .eq("item_id", fav.item_id)
          .eq("store_id", fav.store_id)
      )
    );

    const removedCount = toRemove.length - results.filter((r) => r.error).length;
    const failed = results.filter((r) => r.error).length;

    setFavorites((prev) =>
      prev.filter((f) => !selectedKeys.has(favoriteKey(f)))
    );
    setSelectedKeys(new Set());
    setBulkRemoving(false);

    if (removedCount > 0) {
      toast(
        failed > 0
          ? `Removed ${removedCount} favorite${removedCount === 1 ? "" : "s"} (${failed} failed)`
          : `Removed ${removedCount} favorite${removedCount === 1 ? "" : "s"} from your list`,
        failed > 0 ? "error" : "success"
      );
    } else if (failed > 0) {
      toast("Could not remove favorites — try again", "error");
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const itemFavorites = sortedFavorites.filter((f) => f.item);
  const storeFavorites = sortedFavorites.filter((f) => f.store && !f.item);
  const selectionCount = selectedKeys.size;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors motion-reduce:transition-none"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Back to profile
      </Link>

      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
          <Heart size={20} className="text-[var(--primary)]" aria-hidden="true" />
          Favorites
        </h1>
        {favorites.length > 0 && (
          <label
            className={clsx(
              "relative inline-flex items-center gap-1.5 pl-8 pr-3 py-1.5",
              "rounded-lg border border-[var(--border)] bg-[var(--surface)]",
              "text-xs font-medium text-[var(--text-muted)] hover:border-[var(--primary)]/40 transition-colors motion-reduce:transition-none",
              sortKey && "border-[var(--primary)]/40"
            )}
          >
            <ArrowUpDown
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <span className="sr-only">Sort favorites by</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none bg-transparent text-[var(--text)] focus:outline-none cursor-pointer pr-1"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {favorites.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-4"
          role="group"
          aria-label="Filter favorites by dietary tag"
        >
          {FILTER_OPTIONS.map((tag) => (
            <FilterChip
              key={tag}
              label={tag}
              isActive={activeFilter === tag}
              onClick={() => setActiveFilter(tag)}
            />
          ))}
        </div>
      )}

      {selectionCount > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="sticky top-2 z-10 mb-4 p-3 bg-[var(--surface)] border border-[var(--primary)]/30 rounded-xl flex items-center justify-between gap-3 shadow-sm"
        >
          <p className="text-sm text-[var(--text)]">
            <span className="font-semibold font-mono">{selectionCount}</span>{" "}
            selected
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg transition-colors motion-reduce:transition-none"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkRemove}
              disabled={bulkRemoving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--danger)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity motion-reduce:transition-none"
            >
              <Trash2 size={13} aria-hidden="true" />
              {bulkRemoving
                ? "Removing…"
                : `Remove ${selectionCount} from favorites`}
            </button>
          </div>
        </div>
      )}

      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          message="Tap the heart icon on a dish or store to save it for later."
          ctaLabel="Browse the feed"
          ctaHref="/feed"
        />
      ) : sortedFavorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={`No ${activeFilter} favorites`}
          message={
            activeFilter === "Spicy"
              ? "You haven't favorited any spicy dishes yet."
              : `You haven't favorited any ${activeFilter.toLowerCase()} dishes yet.`
          }
        />
      ) : (
        <div className="space-y-6">
          {itemFavorites.length > 0 && (
            <section aria-labelledby="fav-items-heading">
              <SectionHeader
                title={`Dishes (${itemFavorites.length})`}
                id="fav-items-heading"
                variant="accent-line"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                {itemFavorites.map((fav) => {
                  const key = favoriteKey(fav);
                  const isSelected = selectedKeys.has(key);
                  return (
                    <article
                      key={`item-${fav.item_id}`}
                      className={clsx(
                        "relative bg-[var(--surface)] rounded-xl border overflow-hidden group transition-colors motion-reduce:transition-none",
                        isSelected
                          ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                          : "border-[var(--border)]"
                      )}
                    >
                      <label className="absolute top-2 left-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/85 backdrop-blur shadow-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(fav)}
                          aria-label={`Select ${fav.item?.name ?? "favorite"} for bulk removal`}
                          className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
                        />
                      </label>
                      {fav.item?.photo_urls?.[0] ? (
                        <Image
                          src={fav.item.photo_urls[0]}
                          alt={fav.item.name}
                          width={400}
                          height={256}
                          className="w-full h-32 object-cover"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="w-full h-32 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)] flex items-center justify-center"
                        >
                          <Utensils
                            size={28}
                            className="text-[var(--text-subtle)]"
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <Link
                          href={`/feed/${fav.store?.id}/${fav.item_id}`}
                          className="text-sm font-semibold text-[var(--text)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none line-clamp-1"
                        >
                          {fav.item?.name}
                        </Link>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {fav.store?.name}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold font-mono text-[var(--primary)]">
                            ৳{fav.item?.price}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnfavorite(fav)}
                            aria-label={`Remove ${fav.item?.name} from favorites`}
                            aria-pressed="true"
                            className="p-1.5 rounded-full hover:bg-[var(--primary-soft)] transition-colors motion-reduce:transition-none"
                          >
                            <Heart
                              size={14}
                              className="text-[var(--primary)] fill-[var(--primary)]"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {storeFavorites.length > 0 && (
            <section aria-labelledby="fav-stores-heading">
              <SectionHeader
                title={`Stores (${storeFavorites.length})`}
                id="fav-stores-heading"
                variant="accent-line"
              />
              <ul role="list" className="space-y-2 mt-3">
                {storeFavorites.map((fav) => {
                  const key = favoriteKey(fav);
                  const isSelected = selectedKeys.has(key);
                  return (
                    <li
                      key={`store-${fav.store_id}`}
                      className={clsx(
                        "flex items-center gap-3 p-4 bg-[var(--surface)] rounded-xl border transition-colors motion-reduce:transition-none",
                        isSelected
                          ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                          : "border-[var(--border)]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(fav)}
                        aria-label={`Select ${fav.store?.name ?? "favorite"} for bulk removal`}
                        className="w-4 h-4 accent-[var(--primary)] cursor-pointer shrink-0"
                      />
                      <Link
                        href={`/feed/${fav.store_id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        {fav.store?.photo_url ? (
                          <Image
                            src={fav.store.photo_url}
                            alt={fav.store.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-xl object-cover border border-[var(--border)]"
                          />
                        ) : (
                          <div
                            aria-hidden="true"
                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)] flex items-center justify-center"
                          >
                            <StoreIcon
                              size={20}
                              className="text-[var(--text-subtle)]"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text)] truncate">
                            {fav.store?.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-0.5">
                              <Star
                                size={11}
                                className="fill-amber-500 text-amber-500"
                                aria-hidden="true"
                              />
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {fav.store?.rating
                                  ? fav.store.rating.toFixed(1)
                                  : "New"}
                              </span>
                            </div>
                            <span
                              aria-hidden="true"
                              className="text-[var(--text-subtle)]"
                            >
                              ·
                            </span>
                            <span className="flex items-center gap-0.5 text-[11px] text-[var(--text-muted)]">
                              <MapPin size={10} aria-hidden="true" />
                              {fav.store?.pickup_area}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleUnfavorite(fav)}
                        aria-label={`Remove ${fav.store?.name} from favorites`}
                        aria-pressed="true"
                        className="p-2 rounded-full hover:bg-[var(--primary-soft)] transition-colors motion-reduce:transition-none shrink-0"
                      >
                        <Heart
                          size={16}
                          className="text-[var(--primary)] fill-[var(--primary)]"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
