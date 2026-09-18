/**
 * Simple in-memory token-bucket rate limiter for client-side actions.
 *
 * Tracks per-key (typically user id) request timestamps in two sliding
 * windows: per-second and per-minute. Throws if either limit is exceeded.
 *
 * NOTE: This is in-memory only. It resets on server restart and does not
 * coordinate across multiple Node processes / serverless instances. For a
 * multi-instance deployment, swap the `buckets` Map for a shared store
 * (Redis, Upstash, Supabase table, etc).
 */

type Bucket = {
  /** Timestamps (ms epoch) of requests within the last minute. */
  minute: number[];
  /** Timestems (ms epoch) of requests within the last second. */
  second: number[];
};

const buckets = new Map<string, Bucket>();

export const RATE_LIMITS = {
  /** 5 requests per second per key. */
  perSecond: 5,
  /** 60 requests per minute per key. */
  perMinute: 60,
} as const;

export class RateLimitError extends Error {
  constructor(public readonly window: "second" | "minute") {
    super(`Rate limit exceeded (${window} window)`);
    this.name = "RateLimitError";
  }
}

/**
 * Check and record a request for `key`. Throws `RateLimitError` if either
 * the per-second or per-minute window is full.
 */
export function rateLimit(key: string): void {
  const now = Date.now();
  const secondCutoff = now - 1_000;
  const minuteCutoff = now - 60_000;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { minute: [], second: [] };
    buckets.set(key, bucket);
  }

  // Trim old entries (sliding window).
  bucket.second = bucket.second.filter((t) => t > secondCutoff);
  bucket.minute = bucket.minute.filter((t) => t > minuteCutoff);

  if (bucket.second.length >= RATE_LIMITS.perSecond) {
    throw new RateLimitError("second");
  }
  if (bucket.minute.length >= RATE_LIMITS.perMinute) {
    throw new RateLimitError("minute");
  }

  bucket.second.push(now);
  bucket.minute.push(now);
}

/**
 * Test/utility helper — clear all stored buckets. Not for production use.
 */
export function _resetRateLimits(): void {
  buckets.clear();
}

/**
 * Usage:
 *
 *   import { rateLimit } from "@/lib/supabase/rate-limit";
 *
 *   // In an action that sends a message:
 *   export async function sendMessage(toUserId: string, body: string) {
 *     const { data: { user } } = await supabase.auth.getUser();
 *     if (!user) throw new Error("Not authenticated");
 *
 *     rateLimit(`msg:${user.id}`); // throws RateLimitError on abuse
 *
 *     await supabase.from("messages").insert({ ... });
 *   }
 *
 *   // Other actions that should be rate-limited:
 *   //   - place order    -> rateLimit(`order:${user.id}`)
 *   //   - submit review  -> rateLimit(`review:${user.id}`)
 *   //   - mark notif read-> rateLimit(`notif:${user.id}`)
 */
