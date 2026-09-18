"use client";

import { Star, Heart, Utensils } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { FoodItem } from "@/types";
import { useState } from "react";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { toast } from "@/components/ui/toast";

interface ItemCardProps {
  item: FoodItem;
  priority?: boolean;
  /** When true, render the "Matches your diet" badge (assumes dietary prefs already match). */
  matchesDiet?: boolean;
}

export function ItemCard({ item, priority = false, matchesDiet = false }: ItemCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [pending, setPending] = useState(false);
  const { user } = useAuth();
  const supabase = useSupabase();

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || pending) return;

    const wasFavorited = isFavorited;
    setPending(true);
    setIsFavorited(!wasFavorited);

    try {
      if (wasFavorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, item_id: item.id });
        if (error) throw error;
      }
    } catch {
      setIsFavorited(wasFavorited);
      toast("Failed to update favorite", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Link
      href={`/feed/${item.store_id}/${item.id}`}
      className="group block bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-md hover:border-[var(--primary)]/30 focus-visible:shadow-md focus-visible:border-[var(--primary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 transition-all motion-reduce:transition-none"
    >
      <div className="relative h-36 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)]">
        {item.photo_urls?.[0] ? (
          <Image
            src={item.photo_urls[0]}
            alt={item.name}
            width={400}
            height={300}
            className="w-full h-full object-cover motion-reduce:transition-none group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 33vw"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Utensils size={32} className="text-[var(--text-subtle)]" aria-hidden="true" />
          </div>
        )}

        {item.is_sold_out && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="stamp-sold-out text-sm bg-white/90 px-3 py-1">
              Sold Out
            </span>
          </div>
        )}

        <button
          onClick={toggleFavorite}
          aria-label={isFavorited ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
          aria-pressed={isFavorited}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:scale-110 transition-transform motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          <Heart
            size={14}
            className={
              isFavorited
                ? "fill-[var(--primary)] text-[var(--primary)]"
                : "text-[var(--text-muted)]"
            }
            aria-hidden="true"
          />
        </button>

        {item.dietary_tags?.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {item.dietary_tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-[var(--success)]/95 text-white text-[10px] font-medium rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {matchesDiet && (
          <div
            className="absolute top-2 left-2"
            aria-label="Matches your dietary preferences"
          >
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--primary)]/95 text-white text-[10px] font-medium shadow-sm">
              <Heart size={10} aria-hidden="true" className="fill-white" />
              Matches your diet
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-[var(--text)] truncate">
              {item.name}
            </h3>
            {item.store && (
              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                {item.store.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="price-tag text-sm font-bold text-[var(--primary)] font-mono">
            ৳{item.price.toFixed(0)}
          </span>
          {item.average_rating != null && item.average_rating > 0 && (
            <div
              className="flex items-center gap-0.5"
              aria-label={`Rated ${item.average_rating.toFixed(1)} out of 5`}
            >
              <Star
                size={11}
                className="fill-amber-500 text-amber-500"
                aria-hidden="true"
              />
              <span className="text-xs text-[var(--text-muted)]">
                {item.average_rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}