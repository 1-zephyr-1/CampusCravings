"use client";

import { useEffect, useMemo, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { logCreatorAction } from "@/lib/supabase/log-creator-action";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ count: number; ids: string[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      // Clear stale selection on page change.
      setSelected(new Set());
    }

    fetchListings();
  }, [page, supabase]);

  async function toggleHidden(itemId: string, currentStatus: boolean) {
    await supabase
      .from("food_items")
      .update({ is_sold_out: !currentStatus })
      .eq("id", itemId);

    const actionType = currentStatus ? "listing.unhide" : "listing.hide";
    const target = listings.find((l) => l.id === itemId);
    void logCreatorAction(supabase, {
      action_type: actionType,
      target_type: "food_items",
      target_id: itemId,
      target_label: target?.name,
    });

    setListings((prev) =>
      prev.map((l) =>
        l.id === itemId ? { ...l, is_sold_out: !currentStatus } : l
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
    const allIds = filtered.map((l) => l.id);
    const allSelected = allIds.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleBulkDelete() {
    if (!confirmDelete) return;
    const ids = confirmDelete.ids;
    setDeleting(true);

    const targets = listings.filter((l) => ids.includes(l.id));
    await supabase.from("food_items").delete().in("id", ids);

    for (const t of targets) {
      void logCreatorAction(supabase, {
        action_type: "listing.delete",
        target_type: "food_items",
        target_id: t.id,
        target_label: t.name,
        metadata: { store: t.store?.name },
      });
    }

    setListings((prev) => prev.filter((l) => !ids.includes(l.id)));
    setTotalItems((prev) => prev - ids.length);
    setSelected(new Set());
    setDeleting(false);
    setConfirmDelete(null);
  }

  const filtered = useMemo(
    () =>
      listings.filter((l) => {
        if (filter === "visible") return !l.is_sold_out;
        if (filter === "hidden") return l.is_sold_out;
        return true;
      }),
    [listings, filter]
  );

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading listings" role="status">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const visibleIds = filtered.map((l) => l.id);

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

      <BulkActionBar
        total={filtered.length}
        selectedIds={selected}
        allVisibleIds={visibleIds}
        onToggleAll={toggleAllVisible}
        onClear={clearSelection}
        actions={[
          {
            label: `Delete ${selected.size}`,
            variant: "danger",
            icon: Trash2,
            onClick: () =>
              setConfirmDelete({
                count: selected.size,
                ids: Array.from(selected),
              }),
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
                    colSpan={7}
                    className="px-5 py-10 text-center text-[var(--text-muted)]"
                  >
                    No listings found
                  </td>
                </tr>
              ) : (
                filtered.map((listing) => (
                  <tr
                    key={listing.id}
                    className={clsx(
                      "border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--background)] transition-colors motion-reduce:transition-none",
                      selected.has(listing.id) && "bg-[var(--primary-soft)]/40"
                    )}
                  >
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(listing.id)}
                        onChange={() => toggleSelected(listing.id)}
                        aria-label={`Select ${listing.name}`}
                        className="w-4 h-4 accent-[var(--primary)]"
                      />
                    </td>
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

      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete listings?"
        message={
          confirmDelete
            ? `You're about to permanently delete ${confirmDelete.count} listing${
                confirmDelete.count === 1 ? "" : "s"
              }. This cannot be undone.`
            : ""
        }
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onCancel={() => (deleting ? undefined : setConfirmDelete(null))}
        onConfirm={handleBulkDelete}
        danger
      />
    </div>
  );
}