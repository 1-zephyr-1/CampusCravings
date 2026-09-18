import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for `/orders`. Mirrors the actual order row layout:
 * status pill + title + meta line + price (right-aligned).
 */
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <Skeleton className="h-7 w-32 mb-4" />

      {/* Tab strip */}
      <Skeleton className="h-9 w-48 rounded-lg mb-4" />

      {/* Order rows */}
      <div className="space-y-3" role="status" aria-label="Loading orders">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                {/* Status pill */}
                <Skeleton shape="pill" className="h-4 w-16" />
                {/* Title */}
                <Skeleton className="h-4 w-1/2" />
                {/* Meta line */}
                <Skeleton className="h-3 w-2/3" />
                {/* Timestamp */}
                <Skeleton className="h-3 w-1/3" />
              </div>
              <div className="text-right shrink-0 space-y-2">
                <Skeleton className="h-4 w-14 ml-auto" />
                <Skeleton className="h-3 w-4 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
