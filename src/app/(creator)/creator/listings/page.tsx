"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

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
  const supabase = createClient();

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    const { data } = await supabase
      .from("food_items")
      .select("*, store:stores(name)")
      .order("created_at", { ascending: false });

    setListings((data as ListingWithStore[]) || []);
    setLoading(false);
  }

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
        <div className="h-8 w-8 border-3 border-tomato border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-espresso dark:text-cream">
          Listings
        </h1>
        <div className="flex gap-2">
          {(["all", "visible", "hidden"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-tomato text-white"
                  : "bg-sand/50 text-bark hover:bg-sand dark:bg-[#3A2E20] dark:text-cream/70"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface dark:bg-surface-dark border border-sand dark:border-[#4A3D30] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand dark:border-[#4A3D30]">
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Item
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Store
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Price
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Qty
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Status
                </th>
                <th className="text-right px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-bark dark:text-cream/50"
                  >
                    No listings found
                  </td>
                </tr>
              ) : (
                filtered.map((listing) => (
                  <tr
                    key={listing.id}
                    className="border-b border-sand/50 dark:border-[#4A3D30]/50 last:border-0 hover:bg-sand/20 dark:hover:bg-[#3A2E20]/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-espresso dark:text-cream">
                        {listing.name}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-bark dark:text-cream/60">
                      {listing.store?.name || "N/A"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="price-tag text-espresso dark:text-cream">
                        ৳{listing.price}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-espresso dark:text-cream">
                      {listing.quantity}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          listing.is_sold_out
                            ? "bg-chili/20 text-chili"
                            : "bg-herb/20 text-herb"
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
                            ? "bg-herb/10 text-herb hover:bg-herb/20"
                            : "bg-chili/10 text-chili hover:bg-chili/20"
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
    </div>
  );
}
