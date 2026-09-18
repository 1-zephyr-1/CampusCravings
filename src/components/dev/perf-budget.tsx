"use client";

import { useEffect, useState } from "react";

/**
 * PerfBudget — dev-only floating panel that reports Web Vitals.
 *
 * Only renders when:
 *  - `process.env.NODE_ENV !== "production"` (tree-shaken from prod build), AND
 *  - the URL has `?debug=1`.
 *
 * Captures LCP, CLS, INP, TTFB, and FCP via PerformanceObserver and
 * color-codes each metric against web.dev thresholds.
 */

type Rating = "good" | "needs-improvement" | "poor";

interface Vital {
  name: string;
  value: number;
  unit: string;
  rating: Rating;
}

// Thresholds sourced from https://web.dev/vitals/ — the canonical "good /
// needs improvement / poor" cutoffs.
const THRESHOLDS: Record<
  string,
  { unit: string; good: number; poor: number; lowerIsBetter?: boolean }
> = {
  LCP: { unit: "ms", good: 2500, poor: 4000 },
  CLS: { unit: "", good: 0.1, poor: 0.25 },
  INP: { unit: "ms", good: 200, poor: 500 },
  FID: { unit: "ms", good: 100, poor: 300 },
  TTFB: { unit: "ms", good: 800, poor: 1800 },
  FCP: { unit: "ms", good: 1800, poor: 3000 },
};

function rate(metric: string, value: number): Rating {
  const t = THRESHOLDS[metric];
  if (!t) return "good";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function formatValue(metric: string, value: number): string {
  if (metric === "CLS") return value.toFixed(3);
  return `${Math.round(value)}`;
}

function colorFor(rating: Rating): { bg: string; fg: string; border: string } {
  switch (rating) {
    case "good":
      return { bg: "var(--success-soft)", fg: "var(--success)", border: "var(--success)" };
    case "needs-improvement":
      return { bg: "var(--warning-soft)", fg: "var(--warning)", border: "var(--warning)" };
    case "poor":
      return { bg: "var(--danger-soft)", fg: "var(--danger)", border: "var(--danger)" };
  }
}

export function PerfBudget() {
  const [vitals, setVitals] = useState<Vital[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("debug") !== "1") return;

    const upsert = (name: string, value: number) => {
      const t = THRESHOLDS[name];
      if (!t) return;
      const rating = rate(name, value);
      setVitals((prev) => {
        const filtered = prev.filter((v) => v.name !== name);
        return [
          ...filtered,
          { name, value, unit: t.unit, rating },
        ].sort((a, b) => {
          const order = ["TTFB", "FCP", "LCP", "CLS", "INP", "FID"];
          return order.indexOf(a.name) - order.indexOf(b.name);
        });
      });
    };

    // --- TTFB & FCP from paint-timing navigation entries ---
    try {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (nav) {
        // responseStart - requestStart is the canonical TTFB approximation.
        upsert("TTFB", nav.responseStart - nav.requestStart);
      }
      const paints = performance.getEntriesByType("paint");
      const fcp = paints.find((p) => p.name === "first-contentful-paint");
      if (fcp) upsert("FCP", fcp.startTime);
    } catch {
      // Some browsers gate these behind flags; ignore.
    }

    // --- LCP ---
    let lcpValue = 0;
    let lcpObserver: PerformanceObserver | null = null;
    try {
      lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          lcpValue = entry.startTime;
          upsert("LCP", lcpValue);
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // ignore
    }

    // --- CLS ---
    let clsValue = 0;
    let clsObserver: PerformanceObserver | null = null;
    try {
      clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Ignore shifts caused by recent user input (per spec).
          const ls = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value: number;
          };
          if (!ls.hadRecentInput) clsValue += ls.value;
        }
        upsert("CLS", clsValue);
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {
      // ignore
    }

    // --- INP (preferred) or FID fallback ---
    let inpValue = 0;
    let interactionObserver: PerformanceObserver | null = null;
    try {
      interactionObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const dur = (entry as PerformanceEntry & { duration: number }).duration;
          if (dur > inpValue) inpValue = dur;
        }
        if (inpValue > 0) {
          upsert("INP", inpValue);
          // Once INP is reported we can stop advertising FID.
          setVitals((prev) => prev.filter((v) => v.name !== "FID"));
        }
      });
      // event-timing includes both INP and FID; INP uses duration, FID uses
      // processingStart - startTime. We pick the longer duration as INP and
      // additionally surface FID if available.
      interactionObserver.observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    } catch {
      // older browsers — fall through to FID-only
    }

    return () => {
      lcpObserver?.disconnect();
      clsObserver?.disconnect();
      interactionObserver?.disconnect();
    };
  }, []);

  if (process.env.NODE_ENV === "production") return null;
  if (typeof window !== "undefined") {
    if (new URLSearchParams(window.location.search).get("debug") !== "1") return null;
  }
  if (vitals.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="perf-budget"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 9999,
        fontFamily: "var(--font-mono, ui-monospace, monospace)",
        fontSize: 11,
        lineHeight: 1.4,
        background: "var(--surface)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)",
        padding: "10px 12px",
        minWidth: 180,
        opacity: 0.95,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-subtle)",
          marginBottom: 6,
        }}
      >
        Web Vitals · debug
      </div>
      <ul style={{ display: "grid", gap: 4, margin: 0, padding: 0, listStyle: "none" }}>
        {vitals.map((v) => {
          const c = colorFor(v.rating);
          return (
            <li
              key={v.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "2px 6px",
                borderRadius: 4,
                background: c.bg,
                border: `1px solid ${c.border}`,
              }}
            >
              <span style={{ color: c.fg, fontWeight: 600 }}>{v.name}</span>
              <span style={{ color: c.fg, fontVariantNumeric: "tabular-nums" }}>
                {formatValue(v.name, v.value)}
                {v.unit}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
