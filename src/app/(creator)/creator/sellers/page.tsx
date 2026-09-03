"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, X, Store as StoreIcon } from "lucide-react";

interface SellerWithProfile {
  id: string;
  user_id: string;
  name: string;
  description: string;
  photo_url: string | null;
  pickup_area: string;
  is_open: boolean;
  is_approved: boolean;
  rating: number;
  total_ratings: number;
  created_at: string;
  updated_at: string;
  profile: {
    full_name: string;
    email: string;
    is_approved: boolean;
  } | null;
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<SellerWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const supabase = createClient();

  useEffect(() => {
    fetchSellers();
  }, []);

  async function fetchSellers() {
    const { data } = await supabase
      .from("stores")
      .select("*, profile:profiles!stores_user_id_fkey(full_name, email, is_approved)")
      .order("created_at", { ascending: false });

    setSellers((data as SellerWithProfile[]) || []);
    setLoading(false);
  }

  async function handleApprove(storeId: string, userId: string) {
    await supabase
      .from("stores")
      .update({ is_approved: true })
      .eq("id", storeId);

    await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    setSellers((prev) =>
      prev.map((s) =>
        s.id === storeId
          ? {
              ...s,
              is_approved: true,
              profile: s.profile
                ? { ...s.profile, is_approved: true }
                : s.profile,
            }
          : s
      )
    );
  }

  async function handleReject(storeId: string, userId: string) {
    await supabase
      .from("stores")
      .update({ is_approved: false })
      .eq("id", storeId);

    await supabase
      .from("profiles")
      .update({ is_approved: false })
      .eq("id", userId);

    setSellers((prev) =>
      prev.map((s) =>
        s.id === storeId
          ? {
              ...s,
              is_approved: false,
              profile: s.profile
                ? { ...s.profile, is_approved: false }
                : s.profile,
            }
          : s
      )
    );
  }

  const filtered = sellers.filter((s) => {
    if (filter === "pending") return !s.is_approved;
    if (filter === "approved") return s.is_approved;
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
          Sellers
        </h1>
        <div className="flex gap-2">
          {(["all", "pending", "approved"] as const).map((f) => (
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
              {f === "pending" && (
                <span className="ml-1.5 bg-tomato/20 text-tomato px-1.5 rounded-full text-xs">
                  {sellers.filter((s) => !s.is_approved).length}
                </span>
              )}
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
                  Seller
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Store
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-medium text-bark dark:text-cream/60">
                  Joined
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
                    colSpan={5}
                    className="px-5 py-10 text-center text-bark dark:text-cream/50"
                  >
                    No sellers found
                  </td>
                </tr>
              ) : (
                filtered.map((seller) => (
                  <tr
                    key={seller.id}
                    className="border-b border-sand/50 dark:border-[#4A3D30]/50 last:border-0 hover:bg-sand/20 dark:hover:bg-[#3A2E20]/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-espresso dark:text-cream">
                        {seller.profile?.full_name || "N/A"}
                      </p>
                      <p className="text-xs text-bark dark:text-cream/50">
                        {seller.profile?.email}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StoreIcon size={14} className="text-bark" />
                        <span className="text-espresso dark:text-cream">
                          {seller.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          seller.is_approved
                            ? "bg-herb/20 text-herb"
                            : "bg-turmeric/20 text-amber-700"
                        }`}
                      >
                        {seller.is_approved ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-bark dark:text-cream/50">
                      {new Date(seller.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!seller.is_approved && (
                          <>
                            <button
                              onClick={() =>
                                handleApprove(seller.id, seller.user_id)
                              }
                              className="p-1.5 rounded-lg bg-herb/10 text-herb hover:bg-herb/20 transition-colors"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleReject(seller.id, seller.user_id)
                              }
                              className="p-1.5 rounded-lg bg-chili/10 text-chili hover:bg-chili/20 transition-colors"
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        {seller.is_approved && (
                          <button
                            onClick={() =>
                              handleReject(seller.id, seller.user_id)
                            }
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-chili/10 text-chili hover:bg-chili/20 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
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
