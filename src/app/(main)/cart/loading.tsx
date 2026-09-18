import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for `/cart`. Mirrors a typical cart store group:
 * store header + line items (image + name/meta + qty stepper + price).
 */
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4" role="status" aria-label="Loading cart">
      <Skeleton className="h-7 w-32 mb-4" />

      {/* Info banner */}
      <Skeleton className="h-9 w-full rounded-lg mb-3" />

      {/* Store group */}
      <div className="mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {/* Store header */}
        <div className="px-4 pt-3 pb-2 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>

        {/* Line items */}
        <ul role="list" className="divide-y divide-[var(--border)]">
          {[...Array(3)].map((_, i) => (
            <li key={i} className="flex items-center gap-3 p-3">
              {/* Thumbnail */}
              <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
              {/* Title + meta */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              {/* Quantity stepper */}
              <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
              {/* Price */}
              <Skeleton className="h-4 w-12 shrink-0" />
              {/* Trash */}
              <Skeleton className="h-6 w-6 rounded-md shrink-0" />
            </li>
          ))}
        </ul>

        {/* Pickup time */}
        <div className="px-4 py-3 bg-[var(--background)] border-t border-[var(--border)]">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>

      {/* Total + CTA */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-3 w-2/3 mx-auto" />
      </div>
    </div>
  );
}
