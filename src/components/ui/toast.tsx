"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

export type ToastType = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  /** Absolute path or full URL passed to window.location. */
  href: string;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

let toastId = 0;
let listeners: ((toast: Toast) => void)[] = [];

/**
 * Show a transient notification.
 *
 * Pass `action` to add a button that navigates when clicked; the toast is
 * dismissed at the same time.
 */
export function toast(
  message: string,
  type: ToastType = "info",
  action?: ToastAction
) {
  const id = ++toastId;
  listeners.forEach((l) => l({ id, message, type, action }));
}

const TOAST_TTL_MS = 4000;

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, TOAST_TTL_MS);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 sm:bottom-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "flex items-center gap-2 pl-4 pr-2 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-up max-w-sm",
            t.type === "success" && "bg-[var(--success)] text-white",
            t.type === "error" && "bg-[var(--danger)] text-white",
            t.type === "info" && "bg-[var(--surface-elev)] text-[var(--text)] border border-[var(--border)]"
          )}
        >
          <span className="flex-1 py-1">{t.message}</span>
          {t.action ? (
            <button
              type="button"
              onClick={() => {
                dismiss(t.id);
                if (typeof window !== "undefined") {
                  window.location.href = t.action!.href;
                }
              }}
              className={clsx(
                "shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors motion-reduce:transition-none",
                t.type === "info"
                  ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                  : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              {t.action.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className={clsx(
              "shrink-0 p-1 rounded-md transition-colors motion-reduce:transition-none",
              t.type === "info"
                ? "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
