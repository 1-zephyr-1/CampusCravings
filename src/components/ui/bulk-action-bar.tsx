"use client";

import { CheckSquare, Square, X } from "lucide-react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

export interface BulkAction {
  label: string;
  /** Visual treatment. `danger` actions are styled red. */
  variant?: "primary" | "danger" | "neutral";
  icon?: LucideIcon;
  onClick: () => void;
  /** Optional disabled flag (e.g. when no items are eligible for the action). */
  disabled?: boolean;
}

interface BulkActionBarProps {
  /** Total rows in the current filtered set; controls "select all". */
  total: number;
  /** IDs currently selected. */
  selectedIds: Set<string>;
  /** All visible row IDs (used by "select all"). */
  allVisibleIds: string[];
  onToggleAll: () => void;
  onClear: () => void;
  actions: BulkAction[];
}

/**
 * Floating toolbar that appears above a table when one or more rows are
 * selected. Renders the selection count and a row of action buttons. Kept as
 * a separate component so each page can wire its own per-row checkbox state.
 */
export function BulkActionBar({
  total,
  selectedIds,
  allVisibleIds,
  onToggleAll,
  onClear,
  actions,
}: BulkActionBarProps) {
  const count = selectedIds.size;
  if (count === 0) return null;

  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className={clsx(
        "sticky top-0 z-10 mb-3",
        "flex items-center gap-3 px-4 py-3",
        "bg-[var(--primary-soft)] border border-[var(--primary)]/30 rounded-xl",
        "shadow-sm"
      )}
    >
      <button
        type="button"
        onClick={onToggleAll}
        aria-pressed={allSelected}
        aria-label={allSelected ? "Deselect all" : "Select all"}
        className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] hover:opacity-80 transition-opacity motion-reduce:transition-none"
      >
        {allSelected ? (
          <CheckSquare size={16} aria-hidden="true" />
        ) : (
          <Square size={16} aria-hidden="true" />
        )}
        {allSelected ? "Deselect all" : "Select all"}
      </button>

      <span aria-live="polite" className="text-sm text-[var(--text)]">
        <strong className="font-bold">{count}</strong> of {total} selected
      </span>

      <div className="flex items-center gap-2 ml-auto">
        {actions.map((action) => {
          const Icon = action.icon;
          const variant = action.variant ?? "neutral";
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors motion-reduce:transition-none",
                variant === "primary" &&
                  "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50",
                variant === "danger" &&
                  "bg-[var(--danger)] text-white hover:opacity-90 disabled:opacity-50",
                variant === "neutral" &&
                  "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--background)] disabled:opacity-50",
                "disabled:cursor-not-allowed"
              )}
            >
              {Icon ? <Icon size={13} aria-hidden="true" /> : null}
              {action.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--text)] transition-colors motion-reduce:transition-none"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}