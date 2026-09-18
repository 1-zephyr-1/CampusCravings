"use client";

import { useEffect, useMemo, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { Check, ShieldCheck, ShieldOff, Store as StoreIcon } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { logCreatorAction } from "@/lib/supabase/log-creator-action";
import { clsx } from "clsx";

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

type BulkMode = "approve" | "revoke" | null;

export default function SellersPage() {
  const [sellers, setSellers] = useState<SellerWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [totalItems, setTotalItems] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ mode: BulkMode; ids: string[] } | null>(null);
  const [working, setWorking] = useState(false);
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
      setSelected(new Set());
    }

    fetchSellers();
  }, [page, supabase]);

  async function handleApprove(storeId: string, userId: string) {
    await supabase
      .from("stores")
      .update({ is_approved: true })
      .eq("id", storeId);

    await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    const target = sellers.find((s) => s.id === storeId);
    void logCreatorAction(supabase, {
      action_type: "seller.approve",
      target_type: "stores",
      target_id: storeId,
      target_label: target?.name,
    });

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

    const target = sellers.find((s) => s.id === storeId);
    void logCreatorAction(supabase, {
      action_type: "seller.revoke",
      target_type: "stores",
      target_id: storeId,
      target_label: target?.name,
    });

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

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const visibleIds = filtered.map((s) => s.id);
    const allSelected = visibleIds.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(visibleIds));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function requestBulk(mode: BulkMode) {
    setConfirm({ mode, ids: Array.from(selected) });
  }

  async function performBulk(mode: BulkMode, ids: string[]) {
    if (!mode) return;
    setWorking(true);

    const targets = sellers.filter((s) => ids.includes(s.id));
    // Approve / revoke stores + linked profile rows.
    for (const t of targets) {
      await supabase
        .from("stores")
        .update({ is_approved: mode === "approve" })
        .eq("id", t.id);

      if (t.user_id) {
        await supabase
          .from("profiles")
          .update({ is_approved: mode === "approve" })
          .eq("id", t.user_id);
      }

      void logCreatorAction(supabase, {
        action_type: mode === "approve" ? "seller.approve" : "seller.revoke",
        target_type: "stores",
        target_id: t.id,
        target_label: t.name,
      });
    }

    setSellers((prev) =>
      prev.map((s) =>
        ids.includes(s.id)
          ? {
              ...s,
              is_approved: mode === "approve",
              profile: s.profile
                ? { ...s.profile, is_approved: mode === "approve" }
                : s.profile,
            }
          : s
      )
    );
    setSelected(new Set());
    setConfirm(null);
    setWorking(false);
  }

  const filtered = useMemo(
    () =>
      sellers.filter((s) => {
        if (filter === "pending") return !s.is_approved;
        if (filter === "approved") return s.is_approved;
        return true;
      }),
    [sellers, filter]
  );

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading sellers" role="status">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const visibleIds = filtered.map((s) => s.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Sellers
        </h1>
        <div role="tablist" aria-label="Filter sellers" className="flex gap-2">
          {(["all", "pending", "approved"] as const).map((f) => (
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
              {f === "pending" && (
                <span className="ml-1.5 bg-[var(--primary)]/20 text-[var(--primary)] px-1.5 rounded-full text-xs">
                  {sellers.filter((s) => !s.is_approved).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <BulkActionBar
        total={filtered.length}
        selectedIds={selected}
        allVisibleIds={visibleIds}
        onToggleAll={toggleAllVisible}
        onClear={clearSelection}
        actions={[
          {
            label: `Approve ${selected.size}`,
            variant: "primary",
            icon: ShieldCheck,
            onClick: () => requestBulk("approve"),
          },
          {
            label: `Revoke ${selected.size}`,
            variant: "danger",
            icon: ShieldOff,
            onClick: () => requestBulk("revoke"),
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
                  Seller
                </th>
                <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">
                  Store
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
                    No sellers found
                  </td>
                </tr>
              ) : (
                filtered.map((seller) => (
                  <tr
                    key={seller.id}
                    className={clsx(
                      "border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--background)] transition-colors motion-reduce:transition-none",
                      selected.has(seller.id) && "bg-[var(--primary-soft)]/40"
                    )}
                  >
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(seller.id)}
                        onChange={() => toggleSelected(seller.id)}
                        aria-label={`Select ${seller.name}`}
                        className="w-4 h-4 accent-[var(--primary)]"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-[var(--text)]">
                        {seller.profile?.full_name || "N/A"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {seller.profile?.email}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StoreIcon size={14} className="text-[var(--text-muted)]" aria-hidden="true" />
                        <span className="text-[var(--text)]">
                          {seller.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={clsx(
                          "inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium",
                          seller.is_approved
                            ? "bg-[var(--success)]/20 text-[var(--success)]"
                            : "bg-[var(--warning-soft)] text-[var(--warning)]"
                        )}
                      >
                        {seller.is_approved ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--text-muted)]">
                      {new Date(seller.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!seller.is_approved && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleApprove(seller.id, seller.user_id)
                              }
                              aria-label={`Approve ${seller.name}`}
                              className="p-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors motion-reduce:transition-none"
                              title="Approve"
                            >
                              <Check size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleReject(seller.id, seller.user_id)
                              }
                              aria-label={`Reject ${seller.name}`}
                              className="p-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors motion-reduce:transition-none"
                              title="Reject"
                            >
                              <ShieldOff size={16} aria-hidden="true" />
                            </button>
                          </>
                        )}
                        {seller.is_approved && (
                          <button
                            type="button"
                            onClick={() =>
                              handleReject(seller.id, seller.user_id)
                            }
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors motion-reduce:transition-none"
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

      <ConfirmModal
        open={confirm !== null}
        title={confirm?.mode === "approve" ? "Approve sellers?" : "Revoke sellers?"}
        message={
          confirm
            ? `You're about to ${confirm.mode} ${confirm.ids.length} seller${
                confirm.ids.length === 1 ? "" : "s"
              }. ${confirm.mode === "approve" ? "They will be visible to buyers immediately." : "They will lose the ability to operate."}`
            : ""
        }
        confirmLabel={
          working ? "Working..." : confirm?.mode === "approve" ? "Approve" : "Revoke"
        }
        onCancel={() => (working ? undefined : setConfirm(null))}
        onConfirm={() => confirm && performBulk(confirm.mode, confirm.ids)}
        danger={confirm?.mode === "revoke"}
      />
    </div>
  );
}