import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | CampusCravings",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div
          aria-hidden="true"
          className="w-20 h-20 bg-[var(--primary-soft)] rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <span className="text-4xl font-bold text-[var(--primary)]">404</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          Page not found
        </h1>
        <p className="text-[var(--text-muted)] mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/feed"
            className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
          >
            Browse Food
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-lg font-medium text-sm hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
