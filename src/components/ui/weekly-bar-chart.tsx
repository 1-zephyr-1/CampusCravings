"use client";

import { useState } from "react";
import { clsx } from "clsx";

interface WeeklyBarChartProps {
  /** This-week values, oldest first. Length should be 7. */
  thisWeek: number[];
  /** Last-week values, oldest first. Length should be 7. */
  lastWeek: number[];
  /** Optional accessible label, e.g. "New users this week vs last week". */
  label?: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Lightweight dual-series bar chart rendered as inline SVG. Shows this week
 * (filled, primary) alongside last week (muted). Tooltip appears on hover and
 * is implemented purely with CSS — no JS chart lib needed.
 */
export function WeeklyBarChart({
  thisWeek,
  lastWeek,
  label,
}: WeeklyBarChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const W = 320;
  const H = 140;
  const PADDING_X = 12;
  const PADDING_TOP = 24;
  const PADDING_BOTTOM = 24;

  const innerW = W - PADDING_X * 2;
  const innerH = H - PADDING_TOP - PADDING_BOTTOM;
  const groupW = innerW / 7;
  const barW = (groupW - 6) / 2;
  const gap = 6;

  const max = Math.max(1, ...thisWeek, ...lastWeek);
  const totalThis = thisWeek.reduce((s, n) => s + n, 0);
  const totalLast = lastWeek.reduce((s, n) => s + n, 0);
  const diff = totalThis - totalLast;
  const pct =
    totalLast === 0
      ? totalThis > 0
        ? 100
        : 0
      : Math.round((diff / totalLast) * 100);

  return (
    <div
      className="relative"
      role="img"
      aria-label={
        label ??
        `This week: ${totalThis}. Last week: ${totalLast}.`
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        className="overflow-visible"
      >
        {/* Baseline */}
        <line
          x1={PADDING_X}
          x2={W - PADDING_X}
          y1={H - PADDING_BOTTOM + 0.5}
          y2={H - PADDING_BOTTOM + 0.5}
          stroke="var(--border)"
          strokeWidth="1"
        />

        {thisWeek.map((val, i) => {
          const last = lastWeek[i] ?? 0;
          const x = PADDING_X + i * groupW;
          const thisH = (val / max) * innerH;
          const lastH = (last / max) * innerH;
          const thisY = H - PADDING_BOTTOM - thisH;
          const lastY = H - PADDING_BOTTOM - lastH;

          return (
            <g key={i}>
              {/* Invisible hit area for tooltip */}
              <rect
                x={x}
                y={PADDING_TOP}
                width={groupW}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                className="cursor-pointer"
              />
              <rect
                x={x + gap / 2}
                y={lastY}
                width={barW}
                height={lastH}
                rx="2"
                fill="var(--border)"
              />
              <rect
                x={x + gap / 2 + barW}
                y={thisY}
                width={barW}
                height={thisH}
                rx="2"
                fill="var(--primary)"
              />
              <text
                x={x + groupW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-muted)"
                fontWeight="500"
              >
                {DAY_LABELS[i]}
              </text>
            </g>
          );
        })}
      </svg>

      {hoverIdx !== null && (
        <div
          className={clsx(
            "absolute -top-1 left-0 -translate-y-full",
            "px-2.5 py-1.5 rounded-lg",
            "bg-[var(--surface)] border border-[var(--border)] shadow-md",
            "text-xs pointer-events-none whitespace-nowrap z-10"
          )}
          style={{
            left: `calc(${(hoverIdx + 0.5) * (innerW / 7) + PADDING_X}px)`,
            transform: "translate(-50%, -8px)",
          }}
        >
          <p className="font-semibold text-[var(--text)]">
            {DAY_LABELS[hoverIdx]}
          </p>
          <p className="text-[var(--text-muted)] mt-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--primary)] mr-1.5" />
            This week: <strong className="text-[var(--text)]">{thisWeek[hoverIdx]}</strong>
          </p>
          <p className="text-[var(--text-muted)] mt-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--border)] mr-1.5" />
            Last week: <strong className="text-[var(--text)]">{lastWeek[hoverIdx]}</strong>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 px-1 text-xs">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--primary)]" />
            This week
          </span>
          <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--border)]" />
            Last week
          </span>
        </div>
        <span
          className={clsx(
            "font-semibold",
            diff > 0 && "text-[var(--success)]",
            diff < 0 && "text-[var(--danger)]",
            diff === 0 && "text-[var(--text-muted)]"
          )}
        >
          {diff > 0 ? "+" : ""}
          {diff} ({pct > 0 ? "+" : ""}
          {pct}%)
        </span>
      </div>
    </div>
  );
}