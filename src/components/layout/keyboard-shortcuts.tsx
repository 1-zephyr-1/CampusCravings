"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Global keyboard shortcuts for the (main) route group.
 *
 * - "g" then "f" → /feed
 * - "g" then "o" → /orders
 * - "g" then "p" → /profile
 * - "?" (shift+/) → open the help dialog
 *
 * The "g" prefix uses a 1-second timeout: if the second key isn't pressed
 * within 1s, the prefix is forgotten. The shortcuts ignore key events fired
 * inside form fields, and they don't fire when modifier keys (cmd/ctrl/alt/meta)
 * or CapsLock are held.
 *
 * The help dialog is a focus-trapped modal with role="dialog" + aria-modal="true".
 * Press Escape to close. Focus is moved to the first focusable element on open
 * and restored to whatever triggered it on close.
 */

const SHORTCUTS = [
  { keys: ["g", "f"], label: "Go to feed", href: "/feed" },
  { keys: ["g", "o"], label: "Go to orders", href: "/orders" },
  { keys: ["g", "p"], label: "Go to profile", href: "/profile" },
] as const;

const PREFIX_TIMEOUT_MS = 1000;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingPrefixRef = useRef<string | null>(null);
  const prefixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPrefix = useCallback(() => {
    pendingPrefixRef.current = null;
    if (prefixTimerRef.current) {
      clearTimeout(prefixTimerRef.current);
      prefixTimerRef.current = null;
    }
  }, []);

  const armPrefix = useCallback(
    (key: string) => {
      pendingPrefixRef.current = key;
      if (prefixTimerRef.current) clearTimeout(prefixTimerRef.current);
      prefixTimerRef.current = setTimeout(() => {
        pendingPrefixRef.current = null;
        prefixTimerRef.current = null;
      }, PREFIX_TIMEOUT_MS);
    },
    [],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore modifier-key combos — those belong to the browser/OS.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Ignore CapsLock + key combos (treat as non-shortcut).
      if (event.getModifierState && event.getModifierState("CapsLock")) return;
      // Don't fire when typing in a form field.
      if (isTypingTarget(event.target)) return;

      const key = event.key;

      // Help dialog: ? (shift+/)
      if (key === "?") {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }

      // Single-character shortcuts (lowercased) only.
      if (key.length !== 1) return;
      const lower = key.toLowerCase();

      const pending = pendingPrefixRef.current;
      if (pending === "g") {
        // Resolve the "g X" combo and clear the prefix.
        const match = SHORTCUTS.find(
          (s) => s.keys[0] === "g" && s.keys[1] === lower,
        );
        clearPrefix();
        if (match) {
          event.preventDefault();
          router.push(match.href);
        }
        return;
      }

      // Otherwise, arm the prefix if it's a known starter.
      const startsWithG = SHORTCUTS.some(
        (s) => s.keys[0] === lower && s.keys[1],
      );
      if (startsWithG) {
        armPrefix(lower);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearPrefix();
    };
  }, [router, armPrefix, clearPrefix]);

  // Escape-to-close + focus trap for the help dialog.
  useEffect(() => {
    if (!helpOpen) return;

    const previousActive = document.activeElement as HTMLElement | null;
    const dialog = document.getElementById("keyboard-shortcuts-dialog");
    const focusables = dialog ? getFocusable(dialog) : [];
    if (focusables[0]) focusables[0].focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setHelpOpen(false);
        return;
      }
      if (event.key === "Tab" && dialog) {
        const items = getFocusable(dialog);
        if (items.length === 0) {
          event.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the trigger element on close.
      previousActive?.focus?.();
    };
  }, [helpOpen]);

  return (
    <>
      {helpOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setHelpOpen(false);
          }}
        >
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
          />
          <div
            id="keyboard-shortcuts-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-lg)] p-6 animate-slide-up"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Keyboard shortcuts
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Move around without touching your mouse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="Close shortcuts dialog"
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-elev)] hover:text-[var(--text)] transition-colors"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <ul className="divide-y divide-[var(--border)]">
              {SHORTCUTS.map((shortcut) => (
                <li
                  key={shortcut.keys.join("-")}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="text-[var(--text-muted)]">
                    {shortcut.label}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {shortcut.keys.map((k, i) => (
                      <span key={`${k}-${i}`} className="flex items-center gap-1.5">
                        {i > 0 ? (
                          <span className="text-xs text-[var(--text-subtle)]">
                            then
                          </span>
                        ) : null}
                        <kbd className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-xs font-semibold font-mono rounded-md border border-[var(--border)] bg-[var(--surface-elev)] text-[var(--text)]">
                          {k.toUpperCase()}
                        </kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between py-3 text-sm">
                <span className="text-[var(--text-muted)]">Show this help</span>
                <kbd className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-xs font-semibold font-mono rounded-md border border-[var(--border)] bg-[var(--surface-elev)] text-[var(--text)]">
                  ?
                </kbd>
              </li>
            </ul>

            <p className="mt-4 text-xs text-[var(--text-subtle)]">
              Shortcuts don&apos;t fire while you&apos;re typing in a text field.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
