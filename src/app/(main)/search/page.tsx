import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import SearchClient from "./search-page-client";

export const metadata: Metadata = {
  title: "Search · CampusCravings",
  description:
    "Search across BRAC University student-run kitchens and homemade meals on CampusCravings.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search · CampusCravings",
    description:
      "Search across BRAC University student-run kitchens and homemade meals on CampusCravings.",
    type: "website",
    url: "/search",
    siteName: "CampusCravings",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "CampusCravings search",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Search · CampusCravings",
    description:
      "Search across BRAC University student-run kitchens and homemade meals.",
    images: ["/og-default.png"],
  },
  robots: { index: false, follow: true },
};

function SearchSkeleton() {
  return (
    <div
      className="max-w-5xl mx-auto px-4 md:px-6 py-4"
      role="status"
      aria-label="Loading search results"
    >
      {/* Section header */}
      <div className="mb-5 space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Stores skeleton */}
      <div className="mb-8">
        <Skeleton className="h-5 w-32 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={`store-skel-${i}`}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
            >
              <Skeleton className="h-32" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items skeleton */}
      <div>
        <Skeleton className="h-5 w-24 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={`item-skel-${i}`}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
            >
              <Skeleton className="h-32" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchClient />
    </Suspense>
  );
}
