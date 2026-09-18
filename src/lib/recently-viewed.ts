/**
 * Recently-viewed items — client-only localStorage cache.
 *
 * Stored as a JSON array of:
 *   { id, name, photo_url, store_id, store_name, viewed_at }
 * Most-recent first; capped at MAX_RECENTS entries.
 *
 * SSR-safe: every read/write is guarded by `typeof window`.
 */

export const RECENTLY_VIEWED_KEY = "campuscravings:recently-viewed";
export const DIETARY_PREFS_KEY = "campuscravings:dietary-prefs";
export const MAX_RECENTS = 8;

export interface RecentItem {
  id: string;
  name: string;
  photo_url: string | null;
  store_id: string;
  store_name: string;
  viewed_at: number;
}

function isRecentItem(x: unknown): x is RecentItem {
  return (
    !!x &&
    typeof (x as RecentItem).id === "string" &&
    typeof (x as RecentItem).name === "string" &&
    typeof (x as RecentItem).store_id === "string" &&
    typeof (x as RecentItem).store_name === "string"
  );
}

export function readRecents(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentItem).slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function recordRecent(input: Omit<RecentItem, "viewed_at">): void {
  if (typeof window === "undefined") return;
  if (!input || !input.id) return;
  try {
    const current = readRecents().filter((r) => r.id !== input.id);
    const next: RecentItem[] = [
      { ...input, viewed_at: Date.now() },
      ...current,
    ].slice(0, MAX_RECENTS);
    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
    // Notify same-tab subscribers.
    window.dispatchEvent(new Event("campuscravings:recents-changed"));
  } catch {
    /* storage full — non-fatal */
  }
}

export function clearRecents(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENTLY_VIEWED_KEY);
    window.dispatchEvent(new Event("campuscravings:recents-changed"));
  } catch {
    /* non-fatal */
  }
}

/** Read user's saved dietary preferences (string[] of DIETARY_TAGS). */
export function readDietaryPrefs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DIETARY_PREFS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}
