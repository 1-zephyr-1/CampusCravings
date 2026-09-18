import type { SVGProps } from "react";

export type EmptyIllustrationVariant =
  | "cart"
  | "orders"
  | "favorites"
  | "messages"
  | "items"
  | "notifications"
  | "search"
  | "seller-orders";

interface EmptyIllustrationProps extends SVGProps<SVGSVGElement> {
  variant: EmptyIllustrationVariant;
}

const STROKE = 4;

/**
 * Branded empty-state illustrations. Each variant is a hand-drawn SVG
 * using `currentColor` so the parent can recolor via the design tokens.
 * Keep these under ~50 lines each — they're decorations, not features.
 */
export function EmptyIllustration({
  variant,
  ...props
}: EmptyIllustrationProps) {
  const common = {
    viewBox: "0 0 120 120",
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };

  switch (variant) {
    case "cart":
      return (
        <svg {...common}>
          <path d="M28 36h12l6 40h44l6-28H46" />
          <path d="M46 36a14 14 0 0 1 28 0" />
          <circle cx="52" cy="92" r="5" />
          <circle cx="84" cy="92" r="5" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <path d="M34 18h44l8 14v60a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6z" />
          <path d="M34 18v14h52" />
          <path d="M44 52h24M44 66h24M44 80h16" />
        </svg>
      );
    case "favorites":
      return (
        <svg {...common}>
          <path d="M60 96s-28-16-28-40a16 16 0 0 1 28-10 16 16 0 0 1 28 10c0 24-28 40-28 40z" />
          <path d="M46 50c0 4 2 8 6 10" opacity={0.6} />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          <path d="M22 34a8 8 0 0 1 8-8h52a8 8 0 0 1 8 8v32a8 8 0 0 1-8 8H56l-14 12v-12h-12a8 8 0 0 1-8-8z" />
          <circle cx="42" cy="50" r="2.5" fill="currentColor" />
          <circle cx="58" cy="50" r="2.5" fill="currentColor" />
          <circle cx="74" cy="50" r="2.5" fill="currentColor" />
        </svg>
      );
    case "items":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" />
          <circle cx="60" cy="60" r="30" opacity={0.5} />
          <path d="M44 56a4 4 0 0 1 4-4M76 56a4 4 0 0 1 4-4" />
          <path d="M50 72c4 4 16 4 20 0" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...common}>
          <path d="M30 84h60l-6-8v-22a24 24 0 0 0-48 0v22z" />
          <path d="M50 84a10 10 0 0 0 20 0" />
          <circle cx="86" cy="34" r="8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="52" cy="52" r="26" />
          <path d="M72 72l18 18" />
          <path d="M42 46c2 4 6 6 10 6" opacity={0.6} />
        </svg>
      );
    case "seller-orders":
      return (
        <svg {...common}>
          <path d="M22 30h76v56H22z" />
          <path d="M22 30l8-12h60l8 12" />
          <path d="M44 50v8M60 50v8M76 50v8" />
          <path d="M36 72h48" />
        </svg>
      );
    default:
      return null;
  }
}
