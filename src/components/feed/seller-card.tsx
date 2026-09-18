"use client";

import { Star, Utensils } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Store } from "@/types";

interface SellerCardProps {
  store: Store;
}

export function SellerCard({ store }: SellerCardProps) {
  return (
    <Link
      href={`/feed/${store.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative h-32 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)]">
        {store.photo_url ? (
          <Image
            src={store.photo_url}
            alt={store.name}
            width={400}
            height={300}
            className="w-full h-full object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Utensils size={32} className="text-[var(--text-subtle)]" aria-hidden="true" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              store.is_open
                ? "bg-[var(--success)] text-white"
                : "bg-[var(--surface-elev)] text-[var(--text-muted)]"
            }`}
          >
            {store.is_open ? "Open" : "Closed"}
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-[var(--text)] truncate">
            {store.name}
          </h3>
          {store.is_approved && (
            <span
              className="shrink-0 text-amber-500 text-sm"
              title="Verified Seller"
              aria-label="Verified BRACU student seller"
            >
              ✓
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
          {store.pickup_area}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Star size={12} className="fill-amber-500 text-amber-500" aria-hidden="true" />
          <span className="text-xs font-medium text-[var(--text)]">
            {store.rating > 0 ? store.rating.toFixed(1) : "New"}
          </span>
          {store.total_ratings > 0 && (
            <span className="text-xs text-[var(--text-muted)]">
              ({store.total_ratings})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
