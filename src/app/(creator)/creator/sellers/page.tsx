"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { Check, X, Store as StoreIcon } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

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
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [totalItems, setTotalItems] = useState(0);
  const supabase = useSupabase();

  useEffect(() => {
    async function fetchSellers() {
      const { data, count } = await supabase
        .from("stores")
        .select("*, profile:profiles!stores_user_id_fkey(full_name, email, is_approved)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      setSellers((data as SellerWithProfile[]) || []);
      setTotalItems(count || 0);
      setLoading(false);
    }

    fetchSellers();
  }, [page]);

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
        <div className="h-8 w-8 border-[3px] border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Sellers
        </h1>
        <div className="flex gap-2">
          {(["all", "pending", "approved"] as const).map((f) => (
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
              {f === "pending" && (
                <span className="ml-1.5 bg-red-600/20 text-red-600 px-1.5 rounded-full text-xs">
                  {sellers.filter((s) => !s.is_approved).length}
                </span>
              )}
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
                  Seller
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Store
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Joined
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
                    colSpan={5}
                    className="px-5 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    No sellers found
                  </td>
                </tr>
              ) : (
                filtered.map((seller) => (
                  <tr
                    key={seller.id}
                    className="border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {seller.profile?.full_name || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {seller.profile?.email}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StoreIcon size={14} className="text-gray-500" />
                        <span className="text-gray-900 dark:text-white">
                          {seller.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          seller.is_approved
                            ? "bg-green-600/20 text-green-600"
                            : "bg-amber-500/20 text-amber-600"
                        }`}
                      >
                        {seller.is_approved ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
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
                              className="p-1.5 rounded-lg bg-green-600/10 text-green-600 hover:bg-green-600/20 transition-colors"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleReject(seller.id, seller.user_id)
                              }
                              className="p-1.5 rounded-lg bg-red-600/10 text-red-600 hover:bg-red-600/20 transition-colors"
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
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-red-600/10 text-red-600 hover:bg-red-600/20 transition-colors"
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

      <Pagination page={page} totalPages={Math.ceil(totalItems / PAGE_SIZE)} onPageChange={setPage} />
    </div>
  );
}
