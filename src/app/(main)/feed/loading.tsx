import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for `/feed`. Mirrors the real page structure:
 * header → filter chip row → grid of item cards.
 */
export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4" role="status" aria-label="Loading feed">
      {/* Section header */}
      <div className="mb-5 space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Recently viewed carousel */}
      <div className="mb-5">
        <Skeleton className="h-20 rounded-xl" />
      </div>

      {/* Filter chip row */}
      <div className="flex gap-2 pb-3 mb-4 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} shape="pill" className="h-7 w-20 shrink-0" />
        ))}
      </div>

      {/* View toggle + filters row */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      {/* Item card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
          >
            <Skeleton className="h-32" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-12" />
                <Skeleton shape="pill" className="h-5 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
