"use client";

import { useEffect, useMemo, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { Profile } from "@/types";
import { Shield, ShieldOff, Ban, ShieldCheck } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { logCreatorAction } from "@/lib/supabase/log-creator-action";
import { clsx } from "clsx";

type BulkMode = "ban" | "unban" | null;

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "banned">("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [totalItems, setTotalItems] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ mode: BulkMode; ids: string[] } | null>(null);
  const [working, setWorking] = useState(false);
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
      setSelected(new Set());
    }

    fetchUsers();
  }, [page, supabase]);

  async function toggleBan(userId: string, currentBanned: boolean) {
    await supabase
      .from("profiles")
      .update({ is_banned: !currentBanned })
      .eq("id", userId);

    const actionType = currentBanned ? "user.unban" : "user.ban";
    const target = users.find((u) => u.id === userId);
    void logCreatorAction(supabase, {
      action_type: actionType,
      target_type: "profiles",
      target_id: userId,
      target_label: target?.full_name || target?.email,
    });

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, is_banned: !currentBanned } : u
      )
    );
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const eligibleIds = filtered
      .filter((u) => u.role !== "creator")
      .map((u) => u.id);
    const allSelected = eligibleIds.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(eligibleIds));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function requestBulk(mode: BulkMode) {
    const ids = Array.from(selected);
    setConfirm({ mode, ids });
  }

  async function performBulkBan(mode: BulkMode, ids: string[]) {
    if (!mode) return;
    const newValue = mode === "ban";

    setWorking(true);
    await supabase
      .from("profiles")
      .update({ is_banned: newValue })
      .in("id", ids);

    const actionType: "user.ban" | "user.unban" =
      mode === "ban" ? "user.ban" : "user.unban";

    const targets = users.filter((u) => ids.includes(u.id));
    for (const t of targets) {
      void logCreatorAction(supabase, {
        action_type: actionType,
        target_type: "profiles",
        target_id: t.id,
        target_label: t.full_name || t.email,
      });
    }

    setUsers((prev) =>
      prev.map((u) => (ids.includes(u.id) ? { ...u, is_banned: newValue } : u))
    );
    setSelected(new Set());
    setConfirm(null);
    setWorking(false);
  }

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (filter === "active") return !u.is_banned;
        if (filter === "banned") return u.is_banned;
        return true;
      }),
    [users, filter]
  );

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

  const eligibleIds = filtered
    .filter((u) => u.role !== "creator")
    .map((u) => u.id);

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

      <BulkActionBar
        total={eligibleIds.length}
        selectedIds={selected}
        allVisibleIds={eligibleIds}
        onToggleAll={toggleAllVisible}
        onClear={clearSelection}
        actions={[
          {
            label: `Ban ${selected.size}`,
            variant: "danger",
            icon: Ban,
            onClick: () => requestBulk("ban"),
          },
          {
            label: `Unban ${selected.size}`,
            variant: "primary",
            icon: ShieldCheck,
            onClick: () => requestBulk("unban"),
          },
        ]}
      />

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-5 py-3 w-10">
                  <span className="sr-only">Select</span>
                </th>
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
                    colSpan={6}
                    className="px-5 py-10 text-center text-[var(--text-muted)]"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const eligible = user.role !== "creator";
                  return (
                    <tr
                      key={user.id}
                      className={clsx(
                        "border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--background)] transition-colors motion-reduce:transition-none",
                        selected.has(user.id) && "bg-[var(--primary-soft)]/40"
                      )}
                    >
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(user.id)}
                          onChange={() => toggleSelected(user.id)}
                          disabled={!eligible}
                          aria-label={`Select ${user.full_name || user.email}`}
                          className="w-4 h-4 accent-[var(--primary)] disabled:opacity-40"
                        />
                      </td>
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
                        {eligible && (
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={Math.ceil(totalItems / PAGE_SIZE)} onPageChange={setPage} />

      <ConfirmModal
        open={confirm !== null}
        title={confirm?.mode === "ban" ? "Ban users?" : "Unban users?"}
        message={
          confirm
            ? `You're about to ${confirm.mode} ${confirm.ids.length} user${
                confirm.ids.length === 1 ? "" : "s"
              }. ${confirm.mode === "ban" ? "They will be unable to sign in." : "They will regain access."}`
            : ""
        }
        confirmLabel={working ? "Working..." : confirm?.mode === "ban" ? "Ban" : "Unban"}
        onCancel={() => (working ? undefined : setConfirm(null))}
        onConfirm={() => confirm && performBulkBan(confirm.mode, confirm.ids)}
        danger={confirm?.mode === "ban"}
      />
    </div>
  );
}