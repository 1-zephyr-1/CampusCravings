"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Utensils } from "lucide-react";
import type { RecentItem } from "@/lib/recently-viewed";
import { readRecents } from "@/lib/recently-viewed";

/**
 * Horizontal "Recently viewed" carousel for the buyer feed.
 *
 * Reads from localStorage (key: campuscravings:recently-viewed) and listens
 * for changes so visiting an item-detail page updates the list live in the
 * same tab. Renders nothing until mount to avoid SSR mismatches.
 */
export function RecentlyViewed() {
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRecents(readRecents());
    const onChange = () => setRecents(readRecents());
    window.addEventListener("campuscravings:recents-changed", onChange);
    window.addEventListener("storage", (e) => {
      if (e.key === "campuscravings:recently-viewed") onChange();
    });
    return () => {
      window.removeEventListener("campuscravings:recents-changed", onChange);
    };
  }, []);

  if (!mounted || recents.length === 0) return null;

  return (
    <section
      className="mb-5 -mx-4 md:mx-0"
      aria-label="Recently viewed items"
    >
      <div className="px-4 md:px-0 mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Recently viewed
        </h2>
        <span className="text-[11px] text-[var(--text-subtle)]">
          {recents.length} {recents.length === 1 ? "dish" : "dishes"}
        </span>
      </div>
      <ul
        role="list"
        className="flex gap-2 overflow-x-auto pb-2 px-4 md:px-0 snap-x snap-mandatory scroll-px-4 md:scroll-px-0"
      >
        {recents.map((r) => (
          <li key={r.id} className="shrink-0 snap-start w-32">
            <Link
              href={`/feed/${r.store_id}/${r.id}`}
              className="block bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--primary)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)]/50 transition-colors motion-reduce:transition-none"
            >
              <div className="relative h-20 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)]">
                {r.photo_url ? (
                  <Image
                    src={r.photo_url}
                    alt={r.name}
                    width={128}
                    height={80}
                    className="w-full h-full object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Utensils size={20} className="text-[var(--text-subtle)]" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-[var(--text)] truncate">
                  {r.name}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">
                  {r.store_name}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
