import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
  /** Shape of the skeleton block. Default = rectangle. */
  shape?: "rect" | "pill" | "circle";
}

/**
 * Lightweight animated placeholder for loading states.
 * Uses a CSS shimmer animation instead of `animate-pulse` for a smoother feel.
 * Automatically disabled under `prefers-reduced-motion`.
 */
export function Skeleton({ className, shape = "rect" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "animate-shimmer motion-reduce:animate-none bg-[length:200%_100%]",
        shape === "rect" && "rounded-md",
        shape === "pill" && "rounded-full",
        shape === "circle" && "rounded-full",
        className
      )}
    />
  );
}
