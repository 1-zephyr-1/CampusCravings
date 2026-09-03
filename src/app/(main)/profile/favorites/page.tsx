"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { Favorite, FoodItem, Store } from "@/types";
import Link from "next/link";
import { ChevronLeft, Heart, MapPin, Star } from "lucide-react";

interface FavoriteWithItem extends Favorite {
  item?: FoodItem;
  store?: Store;
}

export default function FavoritesPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [favorites, setFavorites] = useState<FavoriteWithItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function fetchFavorites() {
      const { data: favs } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false });

      if (!favs || favs.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        favs.map(async (fav) => {
          if (fav.item_id) {
            const { data: item } = await supabase
              .from("food_items")
              .select("*, store:stores!food_items_store_id_fkey(id, name, is_open)")
              .eq("id", fav.item_id)
              .single();
            return { ...fav, item: item || undefined };
          }
          if (fav.store_id) {
            const { data: store } = await supabase
              .from("stores")
              .select("*, profile:profiles!stores_user_id_fkey(full_name)")
              .eq("id", fav.store_id)
              .single();
            return { ...fav, store: store || undefined };
          }
          return fav;
        })
      );

      setFavorites(enriched);
      setLoading(false);
    }

    fetchFavorites();
  }, [profile]);

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
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-sand/30 dark:bg-[#3A2E20] rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-48 bg-sand/30 dark:bg-[#3A2E20] rounded-xl animate-pulse"
              />
            ))}
          </div>
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
        className="inline-flex items-center gap-1 text-sm text-bark hover:text-espresso dark:hover:text-cream mb-4"
      >
        <ChevronLeft size={16} />
        Back
      </Link>

      <h1 className="text-xl font-bold text-espresso dark:text-cream mb-6 flex items-center gap-2">
        <Heart size={20} className="text-chili" />
        Favorites
      </h1>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={40} className="mx-auto mb-3 text-bark/30" />
          <p className="text-sm text-bark mb-3">No favorites yet</p>
          <Link
            href="/feed"
            className="text-sm text-tomato font-medium hover:underline"
          >
            Browse the feed
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {itemFavorites.length > 0 && (
            <div>
              <h2 className="accent-line text-sm font-semibold text-espresso dark:text-cream mb-3">
                Items
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {itemFavorites.map((fav) => (
                  <div
                    key={`item-${fav.item_id}`}
                    className="relative bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] overflow-hidden group"
                  >
                    {fav.item?.photo_urls?.[0] ? (
                      <img
                        src={fav.item.photo_urls[0]}
                        alt={fav.item.name}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-tomato/10 to-turmeric/10 flex items-center justify-center text-3xl">
                        🍽️
                      </div>
                    )}
                    <div className="p-3">
                      <Link
                        href={`/feed/${fav.store?.id}/${fav.item_id}`}
                        className="text-sm font-semibold text-espresso dark:text-cream hover:text-tomato transition-colors line-clamp-1"
                      >
                        {fav.item?.name}
                      </Link>
                      <p className="text-xs text-bark mt-0.5">
                        {fav.store?.name}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="price-tag text-sm font-bold font-mono text-tomato">
                          ৳{fav.item?.price}
                        </span>
                        <button
                          onClick={() => handleUnfavorite(fav)}
                          className="p-1.5 rounded-full hover:bg-chili/10 transition-colors"
                        >
                          <Heart
                            size={14}
                            className="text-chili fill-chili"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {storeFavorites.length > 0 && (
            <div>
              <h2 className="accent-line text-sm font-semibold text-espresso dark:text-cream mb-3">
                Stores
              </h2>
              <div className="space-y-2">
                {storeFavorites.map((fav) => (
                  <div
                    key={`store-${fav.store_id}`}
                    className="flex items-center justify-between p-4 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30]"
                  >
                    <Link
                      href={`/feed/${fav.store_id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      {fav.store?.photo_url ? (
                        <img
                          src={fav.store.photo_url}
                          alt={fav.store.name}
                          className="w-12 h-12 rounded-xl object-cover border border-sand dark:border-[#4A3D30]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-tomato/10 to-turmeric/10 flex items-center justify-center text-xl">
                          🍳
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-espresso dark:text-cream truncate">
                          {fav.store?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-0.5">
                            <Star
                              size={11}
                              className="fill-turmeric text-turmeric"
                            />
                            <span className="text-[11px] text-bark">
                              {fav.store?.rating
                                ? fav.store.rating.toFixed(1)
                                : "New"}
                            </span>
                          </div>
                          <span className="text-[11px] text-bark/50">
                            ·
                          </span>
                          <span className="flex items-center gap-0.5 text-[11px] text-bark">
                            <MapPin size={10} />
                            {fav.store?.pickup_area}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleUnfavorite(fav)}
                      className="p-2 rounded-full hover:bg-chili/10 transition-colors shrink-0 ml-2"
                    >
                      <Heart
                        size={16}
                        className="text-chili fill-chili"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
