"use client";

import { Star, Heart } from "lucide-react";
import Link from "next/link";
import { FoodItem } from "@/types";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";

interface ItemCardProps {
  item: FoodItem;
}

export function ItemCard({ item }: ItemCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    if (isFavorited) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", item.id);
      setIsFavorited(false);
    } else {
      await supabase.from("favorites").insert({
        user_id: user.id,
        item_id: item.id,
      });
      setIsFavorited(true);
    }
  }

  return (
    <Link
      href={`/feed/${item.store_id}/${item.id}`}
      className="block bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] overflow-hidden hover:shadow-md transition-shadow group"
    >
      <div className="relative h-36 bg-gradient-to-br from-tomato/5 to-turmeric/5">
        {item.photo_urls?.[0] ? (
          <img
            src={item.photo_urls[0]}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍽️
          </div>
        )}

        {item.is_sold_out && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="stamp-sold-out text-sm bg-surface/90 px-3 py-1">
              Sold Out
            </span>
          </div>
        )}

        <button
          onClick={toggleFavorite}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-sm"
        >
          <Heart
            size={14}
            className={isFavorited ? "fill-chili text-chili" : "text-bark"}
          />
        </button>

        {/* Dietary tags */}
        {item.dietary_tags?.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {item.dietary_tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-herb/90 text-white text-[10px] font-medium rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-espresso dark:text-cream truncate">
              {item.name}
            </h3>
            {item.store && (
              <p className="text-xs text-bark truncate mt-0.5">
                {item.store.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="price-tag text-sm font-bold text-tomato font-mono">
            ৳{item.price.toFixed(0)}
          </span>
          {item.average_rating != null && item.average_rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star size={11} className="fill-turmeric text-turmeric" />
              <span className="text-xs text-bark">
                {item.average_rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
