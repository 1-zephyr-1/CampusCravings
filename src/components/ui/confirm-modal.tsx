"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Focus management: on open, save the previously focused element and move
  // focus into the dialog; on close, restore focus to the trigger.
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement) ?? null;

    // Focus the first focusable element inside the dialog, falling back to
    // the cancel button.
    const dialog = dialogRef.current;
    if (dialog) {
      const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const firstFocusable = focusables[0];
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        cancelRef.current?.focus();
      }
    }

    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  // Escape key closes the modal.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
        return;
      }
      // Focus trap: keep Tab cycling within the dialog.
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !dialog.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  // Body scroll lock while modal is open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  // Backdrop click closes the modal — but ignore clicks that originated on
  // the dialog itself.
  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const iconWrapClass = danger
    ? "bg-[var(--danger-soft)]"
    : "bg-[var(--warning-soft)]";
  const iconClass = danger
    ? "text-[var(--danger)]"
    : "text-[var(--warning)]";
  const confirmClass = danger
    ? "bg-[var(--danger)] hover:opacity-90"
    : "bg-[var(--primary)] hover:bg-[var(--primary-hover)]";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative bg-[var(--surface)] rounded-2xl shadow-xl max-w-sm w-full p-6 animate-slide-up motion-reduce:animate-none border border-[var(--border)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${iconWrapClass}`}
          >
            <AlertTriangle size={20} className={iconClass} />
          </div>
          <h3
            id="confirm-title"
            className="text-lg font-semibold text-[var(--text)]"
          >
            {title}
          </h3>
        </div>
        <p
          id="confirm-message"
          className="text-sm text-[var(--text-muted)] mb-6"
        >
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-elev)] rounded-lg transition-colors motion-reduce:transition-none border border-[var(--border)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors motion-reduce:transition-none ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
