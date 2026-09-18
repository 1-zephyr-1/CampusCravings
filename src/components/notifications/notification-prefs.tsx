"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { ShoppingBag, MessageSquare, Megaphone } from "lucide-react";

import { toast } from "@/components/ui/toast";

export const NOTIF_PREFS_STORAGE_KEY = "campuscravings:notification-prefs";

export type NotificationPrefKey = "orderUpdates" | "messages" | "promotions";

export interface NotificationPrefs {
  orderUpdates: boolean;
  messages: boolean;
  promotions: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  orderUpdates: true,
  messages: true,
  promotions: true,
};

function readPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_NOTIF_PREFS;
  try {
    const raw = window.localStorage.getItem(NOTIF_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIF_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      orderUpdates: parsed.orderUpdates ?? DEFAULT_NOTIF_PREFS.orderUpdates,
      messages: parsed.messages ?? DEFAULT_NOTIF_PREFS.messages,
      promotions: parsed.promotions ?? DEFAULT_NOTIF_PREFS.promotions,
    };
  } catch {
    return DEFAULT_NOTIF_PREFS;
  }
}

function writePrefs(prefs: NotificationPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      NOTIF_PREFS_STORAGE_KEY,
      JSON.stringify(prefs)
    );
  } catch {
    // ignore quota errors — UI state still reflects the user's choice
  }
}

interface PrefRow {
  key: NotificationPrefKey;
  label: string;
  hint: string;
  icon: typeof ShoppingBag;
}

const PREF_ROWS: PrefRow[] = [
  {
    key: "orderUpdates",
    label: "Order updates",
    hint: "New orders, status changes, and pickup reminders.",
    icon: ShoppingBag,
  },
  {
    key: "messages",
    label: "Messages",
    hint: "New chat messages from sellers or buyers.",
    icon: MessageSquare,
  },
  {
    key: "promotions",
    label: "Promotions",
    hint: "Creator announcements and new-store highlights.",
    icon: Megaphone,
  },
];

/**
 * Notification preferences for the current user.
 *
 * Stored in localStorage under `campuscravings:notification-prefs` so the
 * client-side realtime subscriber (in `<TopBar />`) can decide whether to
 * surface a toast when a new notification arrives.
 */
export function NotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIF_PREFS);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount so SSR and the first client render
  // agree on the defaults.
  useEffect(() => {
    setPrefs(readPrefs());
    setHydrated(true);
  }, []);

  function handleToggle(key: NotificationPrefKey) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      writePrefs(next);
      toast(
        next[key]
          ? `${labelFor(key)} turned on`
          : `${labelFor(key)} turned off`,
        "success"
      );
      return next;
    });
  }

  return (
    <section
      aria-labelledby="notif-prefs-heading"
      className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
    >
      <header className="mb-3">
        <h2
          id="notif-prefs-heading"
          className="text-sm font-semibold text-[var(--text)]"
        >
          Notifications
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Control which in-app notifications you receive.
        </p>
      </header>

      <ul
        role="list"
        className="divide-y divide-[var(--border)]"
      >
        {PREF_ROWS.map(({ key, label, hint, icon: Icon }) => {
          const checked = prefs[key];
          return (
            <li key={key} className="py-3 first:pt-0 last:pb-0">
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => handleToggle(key)}
                className="w-full flex items-center justify-between gap-3 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <span className="flex items-start gap-3 min-w-0">
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors motion-reduce:transition-none",
                      checked
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "bg-[var(--background)] text-[var(--text-muted)]"
                    )}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--text)]">
                      {label}
                    </span>
                    <span className="block text-xs text-[var(--text-muted)] mt-0.5">
                      {hint}
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={clsx(
                    "shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors motion-reduce:transition-none",
                    checked
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--border-strong)]"
                  )}
                >
                  <span
                    className={clsx(
                      "block w-5 h-5 bg-white rounded-full shadow-sm transition-transform motion-reduce:transition-none",
                      checked ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] text-[var(--text-subtle)]">
        {hydrated
          ? "Saved locally on this device."
          : "Loading preferences…"}
      </p>
    </section>
  );
}

function labelFor(key: NotificationPrefKey): string {
  return PREF_ROWS.find((r) => r.key === key)?.label ?? key;
}
