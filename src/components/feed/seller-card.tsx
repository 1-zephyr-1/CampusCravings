"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { Store } from "@/types";

interface SellerCardProps {
  store: Store;
}

export function SellerCard({ store }: SellerCardProps) {
  return (
    <Link
      href={`/feed/${store.id}`}
      className="block bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative h-32 bg-gradient-to-br from-tomato/10 to-turmeric/10">
        {store.photo_url ? (
          <img
            src={store.photo_url}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍳
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              store.is_open
                ? "bg-herb text-white"
                : "bg-bark/20 text-bark dark:bg-bark/40"
            }`}
          >
            {store.is_open ? "Open" : "Closed"}
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-espresso dark:text-cream truncate">
            {store.name}
          </h3>
          {store.is_approved && (
            <span className="shrink-0 text-turmeric text-sm" title="Verified Seller">✓</span>
          )}
        </div>
        <p className="text-xs text-bark mt-0.5 truncate">{store.pickup_area}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <Star size={12} className="fill-turmeric text-turmeric" />
          <span className="text-xs font-medium text-espresso dark:text-cream">
            {store.rating > 0 ? store.rating.toFixed(1) : "New"}
          </span>
          {store.total_ratings > 0 && (
            <span className="text-xs text-bark">
              ({store.total_ratings})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
