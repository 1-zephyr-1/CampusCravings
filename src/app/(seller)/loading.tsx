import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for `(seller)` pages. Mirrors the seller dashboard layout
 * (header + status pill + 4 stats cards + recent orders + items grid).
 * Works as a fallback for any seller route without its own loading.tsx.
 */
export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 space-y-4" role="status" aria-label="Loading">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton shape="pill" className="h-7 w-16" />
      </div>

      {/* Onboarding score card */}
      <Skeleton className="h-16 rounded-xl" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] space-y-2"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Two-column area: quick actions + recent orders */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--background)]">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--background)]">
              <div className="space-y-1.5">
                <Skeleton shape="pill" className="h-4 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-2 w-10 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
          >
            <Skeleton className="h-32" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
