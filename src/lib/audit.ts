/**
 * Lightweight audit / error reporting helper.
 *
 * Used by the global `<ErrorBoundary>` and any other component that wants to
 * surface a tracked error. Intentionally a no-op stub — wire it up to
 * Sentry / PostHog / your own endpoint by replacing the body.
 */

export interface AuditEvent {
  /** Short event name, e.g. `"react.error"`. */
  name: string;
  /** Optional structured payload (error, info, etc.). */
  payload?: Record<string, unknown>;
  /** Free-form message. */
  message?: string;
  /** ISO timestamp. Auto-filled if omitted. */
  timestamp?: string;
}

export function audit(event: string | AuditEvent, payload?: Record<string, unknown>) {
  const normalized: AuditEvent =
    typeof event === "string"
      ? { name: event, payload, timestamp: new Date().toISOString() }
      : { ...event, timestamp: event.timestamp ?? new Date().toISOString() };

  if (process.env.NODE_ENV !== "production") {
    // Surface to the browser console in dev so engineers can spot it.
    console.warn("[audit]", normalized.name, normalized.message ?? "", normalized.payload ?? {});
  }

  // Production sink intentionally a no-op for now. Replace with
  // navigator.sendBeacon / fetch to a logging endpoint when ready.
}
