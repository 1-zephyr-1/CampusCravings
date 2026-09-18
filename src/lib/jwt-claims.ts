/**
 * Helpers to read role / approval / ban status from a Supabase JWT.
 *
 * The trigger in `005_jwt_claims.sql` copies those fields from
 * `public.profiles` into `auth.users.raw_app_meta_data`, which Supabase
 * signs into every issued access token. So we can read them with no DB hit.
 *
 * If claims aren't populated yet (e.g. legacy users before the trigger was
 * deployed), callers should fall back to `select from profiles`.
 */
import type { UserRole } from "@/types";

export interface JwtClaims {
  role: UserRole;
  is_approved: boolean;
  is_banned: boolean;
}

/**
 * Read the claims from a Supabase `User.app_metadata`. Returns null when
 * any required field is missing so callers can fall back to a DB lookup.
 */
export function readJwtClaims(
  appMetadata: Record<string, unknown> | null | undefined
): JwtClaims | null {
  if (!appMetadata) return null;
  const role = appMetadata.role;
  const isApproved = appMetadata.is_approved;
  const isBanned = appMetadata.is_banned;
  if (
    (role !== "customer" && role !== "seller" && role !== "creator") ||
    typeof isApproved !== "boolean" ||
    typeof isBanned !== "boolean"
  ) {
    return null;
  }
  return { role, is_approved: isApproved, is_banned: isBanned };
}

/** Helper: pull claims from a User-like object (Supabase User or DTO). */
export function claimsFromUser(user: {
  app_metadata?: Record<string, unknown> | null;
} | null | undefined): JwtClaims | null {
  if (!user) return null;
  return readJwtClaims(user.app_metadata);
}
