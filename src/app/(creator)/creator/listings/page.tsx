"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { Eye, EyeOff } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

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
  }, [page]);

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
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-[3px] border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Listings
        </h1>
        <div className="flex gap-2">
          {(["all", "visible", "hidden"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Item
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Store
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Price
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Qty
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="text-right px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    No listings found
                  </td>
                </tr>
              ) : (
                filtered.map((listing) => (
                  <tr
                    key={listing.id}
                    className="border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {listing.name}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {listing.store?.name || "N/A"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="price-tag text-gray-900 dark:text-white">
                        ৳{listing.price}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-900 dark:text-white">
                      {listing.quantity}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          listing.is_sold_out
                            ? "bg-red-600/20 text-red-600"
                            : "bg-green-600/20 text-green-600"
                        }`}
                      >
                        {listing.is_sold_out ? "Hidden" : "Visible"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() =>
                          toggleHidden(listing.id, listing.is_sold_out)
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          listing.is_sold_out
                            ? "bg-green-600/10 text-green-600 hover:bg-green-600/20"
                            : "bg-red-600/10 text-red-600 hover:bg-red-600/20"
                        }`}
                        title={listing.is_sold_out ? "Unhide" : "Hide"}
                      >
                        {listing.is_sold_out ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
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
