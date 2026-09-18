"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { Profile } from "@/types";
import { Shield, ShieldOff, Ban } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "banned">("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [totalItems, setTotalItems] = useState(0);
  const supabase = useSupabase();

  useEffect(() => {
    async function fetchUsers() {
      const { data, count } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      setUsers(data || []);
      setTotalItems(count || 0);
      setLoading(false);
    }

    fetchUsers();
  }, [page]);

  async function toggleBan(userId: string, currentBanned: boolean) {
    await supabase
      .from("profiles")
      .update({ is_banned: !currentBanned })
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, is_banned: !currentBanned } : u
      )
    );
  }

  const filtered = users.filter((u) => {
    if (filter === "active") return !u.is_banned;
    if (filter === "banned") return u.is_banned;
    return true;
  });

  const roleColors: Record<string, string> = {
    customer: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300",
    seller: "bg-amber-500/20 text-amber-600",
    creator: "bg-red-600/20 text-red-600",
  };

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
          Users
        </h1>
        <div className="flex gap-2">
          {(["all", "active", "banned"] as const).map((f) => (
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
                  User
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Role
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
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center text-red-600 text-sm font-bold shrink-0">
                          {user.full_name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {user.full_name || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          roleColors[user.role] || roleColors.customer
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_banned
                            ? "bg-red-600/20 text-red-600"
                            : "bg-green-600/20 text-green-600"
                        }`}
                      >
                        {user.is_banned ? (
                          <>
                            <Ban size={10} /> Banned
                          </>
                        ) : (
                          "Active"
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {user.role !== "creator" && (
                        <button
                          onClick={() => toggleBan(user.id, user.is_banned)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.is_banned
                              ? "bg-green-600/10 text-green-600 hover:bg-green-600/20"
                              : "bg-red-600/10 text-red-600 hover:bg-red-600/20"
                          }`}
                          title={user.is_banned ? "Unban" : "Ban"}
                        >
                          {user.is_banned ? (
                            <ShieldOff size={16} />
                          ) : (
                            <Shield size={16} />
                          )}
                        </button>
                      )}
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
