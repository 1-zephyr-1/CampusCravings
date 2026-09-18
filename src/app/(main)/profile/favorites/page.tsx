"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Favorite, FoodItem, Store } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Heart, MapPin, Star, Utensils } from "lucide-react";

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
        .select("*, item:food_items!favorites_item_id_fkey(*, store:stores!food_items_store_id_fkey(id, name, is_open)), store:stores!favorites_store_id_fkey(*, profile:profiles!stores_user_id_fkey(full_name))")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false });

      setFavorites((favs as FavoriteWithItem[]) || []);
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
          <div className="h-8 w-48 bg-gray-200/30 dark:bg-gray-700/30 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-48 bg-gray-200/30 dark:bg-gray-700/30 rounded-xl animate-pulse"
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
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-50 mb-4"
      >
        <ChevronLeft size={16} />
        Back
      </Link>

      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-6 flex items-center gap-2">
        <Heart size={20} className="text-red-600" />
        Favorites
      </h1>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 mb-3">No favorites yet</p>
          <Link
            href="/feed"
            className="text-sm text-red-600 font-medium hover:underline"
          >
            Browse the feed
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {itemFavorites.length > 0 && (
            <div>
              <h2 className="accent-line text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
                Items
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {itemFavorites.map((fav) => (
                  <div
                    key={`item-${fav.item_id}`}
                    className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden group"
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
                      <div className="w-full h-32 bg-gradient-to-br from-red-600/10 to-amber-500/10 flex items-center justify-center">
                        <Utensils size={28} className="text-gray-400" />
                      </div>
                    )}
                    <div className="p-3">
                      <Link
                        href={`/feed/${fav.store?.id}/${fav.item_id}`}
                        className="text-sm font-semibold text-gray-900 dark:text-gray-50 hover:text-red-600 transition-colors line-clamp-1"
                      >
                        {fav.item?.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {fav.store?.name}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="price-tag text-sm font-bold font-mono text-red-600">
                          ৳{fav.item?.price}
                        </span>
                        <button
                          onClick={() => handleUnfavorite(fav)}
                          className="p-1.5 rounded-full hover:bg-red-600/10 transition-colors"
                        >
                          <Heart
                            size={14}
                            className="text-red-600 fill-red-600"
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
              <h2 className="accent-line text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
                Stores
              </h2>
              <div className="space-y-2">
                {storeFavorites.map((fav) => (
                  <div
                    key={`store-${fav.store_id}`}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
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
                          className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600/10 to-amber-500/10 flex items-center justify-center">
                          <Utensils size={20} className="text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
                          {fav.store?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-0.5">
                            <Star
                              size={11}
                              className="fill-amber-500 text-amber-500"
                            />
                            <span className="text-[11px] text-gray-500">
                              {fav.store?.rating
                                ? fav.store.rating.toFixed(1)
                                : "New"}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500/50">
                            ·
                          </span>
                          <span className="flex items-center gap-0.5 text-[11px] text-gray-500">
                            <MapPin size={10} />
                            {fav.store?.pickup_area}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleUnfavorite(fav)}
                      className="p-2 rounded-full hover:bg-red-600/10 transition-colors shrink-0 ml-2"
                    >
                      <Heart
                        size={16}
                        className="text-red-600 fill-red-600"
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
