/**
 * Single source of truth for BRACU email validation.
 * Used by auth actions, the middleware, and any future API routes.
 * Keeps the validation logic out of the client bundle — server-only.
 */

export const BRACU_DOMAIN = "g.bracu.ac.bd";

/**
 * Strict check: the email must contain exactly one '@' and the part after
 * the '@' must equal the BRACU domain exactly. Trims whitespace and
 * normalizes to lowercase before checking.
 *
 * Examples:
 *   user@g.bracu.ac.bd          => true
 *   USER@G.BRACU.AC.BD          => true (after normalize)
 *   user@evil.com               => false
 *   user@g.bracu.ac.bd.attacker => false
 *   user@g.bracu.ac.bd@attacker => false
 */
export function isBracuEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");
  if (parts.length !== 2) return false;
  return parts[1] === BRACU_DOMAIN;
}

/**
 * Convenience for use in form validators. Returns a user-friendly message
 * instead of a boolean when the email is invalid.
 */
export function bracuEmailError(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!isBracuEmail(email)) {
    return `Only BRAC University students (@${BRACU_DOMAIN}) can sign up.`;
  }
  return null;
}
