"use client";

import { useState } from "react";
import { Eye, EyeOff, Trash2, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useSupabase } from "@/lib/supabase/use-client";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/ui/toast";

export type BulkAction = "sold_out" | "available" | "delete";

interface BulkActionToolbarProps {
  selectedIds: string[];
  onClear: () => void;
  onActionComplete: (
    action: BulkAction,
    affectedIds: string[],
  ) => void;
}

export function BulkActionToolbar({
  selectedIds,
  onClear,
  onActionComplete,
}: BulkActionToolbarProps) {
  const supabase = useSupabase();
  const [pending, setPending] = useState<BulkAction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedIds.length === 0) return null;

  async function runMutation(action: BulkAction) {
    if (selectedIds.length === 0) return;
    setPending(action);
    try {
      if (action === "delete") {
        // Clean up images first.
        const { data: items } = await supabase
          .from("food_items")
          .select("id, photo_urls")
          .in("id", selectedIds);

        if (items) {
          const pathsToRemove: string[] = [];
          for (const item of items) {
            for (const url of item.photo_urls || []) {
              const path = url.split("/food-images/")[1];
              if (path) pathsToRemove.push(path);
            }
          }
          if (pathsToRemove.length > 0) {
            await supabase.storage.from("food-images").remove(pathsToRemove);
          }
        }

        // Rely on cascade delete for item_categories; delete explicitly for
        // safety in case the schema isn't using ON DELETE CASCADE.
        await supabase
          .from("item_categories")
          .delete()
          .in("item_id", selectedIds);
        const { error } = await supabase
          .from("food_items")
          .delete()
          .in("id", selectedIds);
        if (error) throw error;
        toast(`Deleted ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}`, "success");
      } else {
        const isSoldOut = action === "sold_out";
        const { error } = await supabase
          .from("food_items")
          .update({ is_sold_out: isSoldOut })
          .in("id", selectedIds);
        if (error) throw error;
        toast(
          `Marked ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"} as ${isSoldOut ? "sold out" : "available"}`,
          "success",
        );
      }
      onActionComplete(action, selectedIds);
      onClear();
    } catch {
      toast("Bulk action failed", "error");
    } finally {
      setPending(null);
    }
  }

  const count = selectedIds.length;
  const busy = pending !== null;

  return (
    <>
      <div
        role="region"
        aria-label="Bulk actions"
        className={clsx(
          "sticky top-2 z-20 mb-3",
          "flex flex-wrap items-center gap-2 p-3",
          "bg-[var(--surface-elev,var(--surface))] rounded-xl",
          "border border-[var(--primary)]/30 shadow-sm",
          "animate-slide-down motion-reduce:animate-none",
        )}
      >
        <span className="text-xs font-medium text-[var(--text)]">
          {count} selected
        </span>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => runMutation("sold_out")}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--background)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)]/40 disabled:opacity-50 transition-colors motion-reduce:transition-none"
        >
          {pending === "sold_out" ? (
            <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <EyeOff size={12} aria-hidden="true" />
          )}
          Mark sold out
        </button>

        <button
          type="button"
          onClick={() => runMutation("available")}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--background)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)]/40 disabled:opacity-50 transition-colors motion-reduce:transition-none"
        >
          {pending === "available" ? (
            <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Eye size={12} aria-hidden="true" />
          )}
          Mark available
        </button>

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--danger-soft,var(--danger))]/10 text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)]/20 disabled:opacity-50 transition-colors motion-reduce:transition-none"
        >
          <Trash2 size={12} aria-hidden="true" />
          Delete
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          aria-label="Clear selection"
          className="p-1.5 rounded-full text-[var(--text-muted)] hover:bg-[var(--background)] disabled:opacity-50 transition-colors motion-reduce:transition-none"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title={`Delete ${count} item${count === 1 ? "" : "s"}?`}
        message="This will permanently remove the selected items and their images. This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          setConfirmDelete(false);
          runMutation("delete");
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
