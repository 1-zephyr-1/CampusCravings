"use client";

import { useState } from "react";

interface DayPoint {
  date: Date;
  amount: number;
  label: string;
}

/**
 * Compact 7-day revenue bar chart rendered as a pure inline SVG.
 *
 * Bars scale relative to the maximum day so days with zero revenue
 * collapse to a thin baseline rather than disappearing entirely.
 * Hover/touch reveals a tooltip with the actual revenue amount.
 */
export function RevenueChart({ data }: { data: DayPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // SVG geometry — viewBox keeps it responsive.
  const width = 320;
  const height = 160;
  const paddingX = 16;
  const paddingTop = 12;
  const paddingBottom = 28;
  const usableH = height - paddingTop - paddingBottom;
  const slot = (width - paddingX * 2) / data.length;
  const barWidth = Math.min(28, slot * 0.6);

  const max = Math.max(...data.map((d) => d.amount), 1);
  const tipAmount = hoverIdx != null ? data[hoverIdx].amount : null;

  return (
    <div className="w-full">
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44"
          role="img"
          aria-label="7-day revenue chart"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Baseline */}
          <line
            x1={paddingX}
            x2={width - paddingX}
            y1={height - paddingBottom}
            y2={height - paddingBottom}
            stroke="var(--border)"
            strokeWidth={1}
          />

          {data.map((d, i) => {
            const h = max > 0 ? (d.amount / max) * usableH : 2;
            const x = paddingX + slot * i + (slot - barWidth) / 2;
            const y = height - paddingBottom - h;
            const isHover = hoverIdx === i;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(h, 2)}
                  rx={4}
                  fill={
                    isHover ? "var(--primary-hover)" : "var(--primary)"
                  }
                  opacity={isHover ? 1 : d.amount > 0 ? 0.9 : 0.3}
                  className="transition-opacity motion-reduce:transition-none"
                />
                <text
                  x={x + barWidth / 2}
                  y={height - paddingBottom + 16}
                  textAnchor="middle"
                  className="fill-[var(--text-muted)]"
                  style={{ fontSize: 10 }}
                >
                  {d.label}
                </text>
                {/* Hit area covers full slot for easier hover */}
                <rect
                  x={paddingX + slot * i}
                  y={paddingTop}
                  width={slot}
                  height={usableH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onFocus={() => setHoverIdx(i)}
                  onBlur={() => setHoverIdx(null)}
                  tabIndex={0}
                  role="presentation"
                  aria-label={`${d.label}: ৳${d.amount.toFixed(0)}`}
                />
              </g>
            );
          })}
        </svg>

        {hoverIdx != null && tipAmount != null ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-[var(--text)] text-[var(--surface)] text-xs font-mono shadow-md whitespace-nowrap"
          >
            {data[hoverIdx].label} · ৳{tipAmount.toFixed(0)}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>
          Total:{" "}
          <span className="font-mono font-semibold text-[var(--text)]">
            ৳{data.reduce((s, d) => s + d.amount, 0).toFixed(0)}
          </span>
        </span>
        <span>Best day: ৳{max.toFixed(0)}</span>
      </div>
    </div>
  );
}
