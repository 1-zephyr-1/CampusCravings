import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic skeleton for `(main)` pages that don't define their own loading
 * state. Mirrors the common "header + stacked cards" layout used across
 * the main route group (orders, profile, notifications, etc.).
 */
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-4">
      <Skeleton className="h-7 w-40" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
