"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { Profile } from "@/types";
import { Shield, ShieldOff, Ban } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { clsx } from "clsx";

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
  }, [page, supabase]);

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
    customer: "bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)]",
    seller: "bg-[var(--warning-soft)] text-[var(--warning)]",
    creator: "bg-[var(--primary-soft)] text-[var(--primary)]",
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading users" role="status">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Users
        </h1>
        <div role="tablist" aria-label="Filter users" className="flex gap-2">
          {(["all", "active", "banned"] as const).map((f) => (
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
                  User
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Role
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Joined
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
                    colSpan={5}
                    className="px-5 py-10 text-center text-[var(--text-muted)]"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          aria-hidden="true"
                          className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] text-sm font-bold shrink-0"
                        >
                          {user.full_name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text)] truncate">
                            {user.full_name || "N/A"}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={clsx(
                          "inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                          roleColors[user.role] || roleColors.customer
                        )}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                          user.is_banned
                            ? "bg-[var(--danger)]/20 text-[var(--danger)]"
                            : "bg-[var(--success)]/20 text-[var(--success)]"
                        )}
                      >
                        {user.is_banned ? (
                          <>
                            <Ban size={10} aria-hidden="true" /> Banned
                          </>
                        ) : (
                          "Active"
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--text-muted)]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {user.role !== "creator" && (
                        <button
                          type="button"
                          onClick={() => toggleBan(user.id, user.is_banned)}
                          aria-label={user.is_banned ? `Unban ${user.full_name || user.email}` : `Ban ${user.full_name || user.email}`}
                          aria-pressed={user.is_banned}
                          className={clsx(
                            "p-1.5 rounded-lg transition-colors motion-reduce:transition-none",
                            user.is_banned
                              ? "bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20"
                              : "bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20"
                          )}
                          title={user.is_banned ? "Unban" : "Ban"}
                        >
                          {user.is_banned ? (
                            <ShieldOff size={16} aria-hidden="true" />
                          ) : (
                            <Shield size={16} aria-hidden="true" />
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
