import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <div className="space-y-4">
        <Skeleton className="h-72 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-20" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
