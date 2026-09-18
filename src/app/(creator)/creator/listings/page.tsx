"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { Eye, EyeOff } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { clsx } from "clsx";

interface ListingWithStore {
  id: string;
  store_id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  is_sold_out: boolean;
  ordering_window: string | null;
  photo_urls: string[];
  dietary_tags: string[];
  spice_level: number;
  created_at: string;
  updated_at: string;
  store: { name: string } | null;
}

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [totalItems, setTotalItems] = useState(0);
  const supabase = useSupabase();

  useEffect(() => {
    async function fetchListings() {
      const { data, count } = await supabase
        .from("food_items")
        .select("*, store:stores(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      setListings((data as ListingWithStore[]) || []);
      setTotalItems(count || 0);
      setLoading(false);
    }

    fetchListings();
  }, [page, supabase]);

  async function toggleHidden(itemId: string, currentStatus: boolean) {
    await supabase
      .from("food_items")
      .update({ is_sold_out: !currentStatus })
      .eq("id", itemId);

    setListings((prev) =>
      prev.map((l) =>
        l.id === itemId ? { ...l, is_sold_out: !currentStatus } : l
      )
    );
  }

  const filtered = listings.filter((l) => {
    if (filter === "visible") return !l.is_sold_out;
    if (filter === "hidden") return l.is_sold_out;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading listings" role="status">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Listings
        </h1>
        <div role="tablist" aria-label="Filter listings" className="flex gap-2">
          {(["all", "visible", "hidden"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors motion-reduce:transition-none",
                filter === f
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--background)] text-[var(--text-muted)] hover:bg-[var(--border)]"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Item
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Store
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Price
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Qty
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Status
                </th>
                <th className="text-right px-5 py-3 font-medium text-[var(--text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-[var(--text-muted)]"
                  >
                    No listings found
                  </td>
                </tr>
              ) : (
                filtered.map((listing) => (
                  <tr
                    key={listing.id}
                    className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-[var(--text)]">
                        {listing.name}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-[var(--text-muted)]">
                      {listing.store?.name || "N/A"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="price-tag text-[var(--text)] font-mono">
                        ৳{listing.price}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--text)]">
                      {listing.quantity}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={clsx(
                          "inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium",
                          listing.is_sold_out
                            ? "bg-[var(--danger)]/20 text-[var(--danger)]"
                            : "bg-[var(--success)]/20 text-[var(--success)]"
                        )}
                      >
                        {listing.is_sold_out ? "Hidden" : "Visible"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          toggleHidden(listing.id, listing.is_sold_out)
                        }
                        aria-label={listing.is_sold_out ? `Unhide ${listing.name}` : `Hide ${listing.name}`}
                        aria-pressed={listing.is_sold_out}
                        className={clsx(
                          "p-1.5 rounded-lg transition-colors motion-reduce:transition-none",
                          listing.is_sold_out
                            ? "bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20"
                            : "bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20"
                        )}
                        title={listing.is_sold_out ? "Unhide" : "Hide"}
                      >
                        {listing.is_sold_out ? (
                          <Eye size={16} aria-hidden="true" />
                        ) : (
                          <EyeOff size={16} aria-hidden="true" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={Math.ceil(totalItems / PAGE_SIZE)} onPageChange={setPage} />
    </div>
  );
}
