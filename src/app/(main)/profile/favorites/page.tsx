"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Favorite, FoodItem, Store } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import {
  ChevronLeft,
  Heart,
  MapPin,
  Star,
  Utensils,
  Store as StoreIcon,
} from "lucide-react";

interface FavoriteWithItem extends Favorite {
  item?: FoodItem;
  store?: Store;
}

export default function FavoritesPage() {
  const { profile } = useAuth();
  const supabase = useSupabase();

  const [favorites, setFavorites] = useState<FavoriteWithItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const itemFavorites = favorites.filter((f) => f.item);
  const storeFavorites = favorites.filter((f) => f.store);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors motion-reduce:transition-none"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Back to profile
      </Link>

      <h1 className="text-xl font-bold text-[var(--text)] mb-6 flex items-center gap-2">
        <Heart size={20} className="text-[var(--primary)]" aria-hidden="true" />
        Favorites
      </h1>

      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          message="Tap the heart icon on a dish or store to save it for later."
          ctaLabel="Browse the feed"
          ctaHref="/feed"
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
                {itemFavorites.map((fav) => (
                  <article
                    key={`item-${fav.item_id}`}
                    className="relative bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden group"
                  >
                    {fav.item?.photo_urls?.[0] ? (
                      <Image
                        src={fav.item.photo_urls[0]}
                        alt={fav.item.name}
                        width={400}
                        height={128}
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
                ))}
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
                {storeFavorites.map((fav) => (
                  <li
                    key={`store-${fav.store_id}`}
                    className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
                  >
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
                          <span aria-hidden="true" className="text-[var(--text-subtle)]">
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
                      className="p-2 rounded-full hover:bg-[var(--primary-soft)] transition-colors motion-reduce:transition-none shrink-0 ml-2"
                    >
                      <Heart
                        size={16}
                        className="text-[var(--primary)] fill-[var(--primary)]"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}