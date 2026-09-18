"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { ItemCard } from "@/components/feed/item-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Store, FoodItem } from "@/types";
import {
  Star,
  MapPin,
  Flag,
  ChevronLeft,
  Frown,
  Inbox,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/components/ui/toast";

/**
 * Client island for the seller-store page.
 * Initial store + items data is supplied by the server `page.tsx` wrapper
 * so the server can emit metadata + JSON-LD.
 */
export default function SellerStoreClient({
  initialStore,
  initialItems,
}: {
  initialStore: Store | null;
  initialItems: FoodItem[];
}) {
  const { sellerId } = useParams();
  const { user } = useAuth();
  const supabase = useSupabase();
  const [store] = useState<Store | null>(initialStore);
  const [items] = useState<FoodItem[]>(initialItems);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);

  function openReport() {
    if (!user) {
      toast("Sign in to report a seller", "info");
      return;
    }
    setShowReportModal(true);
  }

  async function submitReport() {
    if (!user || !reportReason.trim()) return;
    setShowReportModal(false);
    setReporting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "store",
      target_id: sellerId as string,
      reason: reportReason.trim(),
    });
    setReporting(false);
    setReportReason("");
    if (error) {
      toast("Failed to send report. Please try again.", "error");
      return;
    }
    toast("Report submitted. Thank you for keeping the marketplace safe.", "success");
  }

  if (!store) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <EmptyState
          icon={Frown}
          title="Store not found"
          message="This shop may have been removed, or the link is incorrect."
          ctaLabel="Browse the feed"
          ctaHref="/feed"
        />
      </div>
    );
  }

  const isOpen = store.is_open;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 animate-fade-in">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors motion-reduce:transition-none"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Back to feed
      </Link>

      {/* Cover */}
      <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)]">
        {store.photo_url ? (
          <Image
            src={store.photo_url}
            alt={store.name}
            width={800}
            height={256}
            className="w-full h-full object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Utensils
              size={56}
              className="text-[var(--text-subtle)]"
              aria-hidden="true"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow">
              {store.name}
            </h1>
            {store.is_approved && (
              <span
                className="text-amber-400 text-lg"
                title="Verified Seller"
                aria-label="Verified BRACU student seller"
              >
                ✓
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div
              className="flex items-center gap-1 text-white"
              aria-label={
                store.rating > 0
                  ? `Rated ${store.rating.toFixed(1)} out of 5`
                  : "New seller, no ratings yet"
              }
            >
              <Star
                size={14}
                className="fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
              <span className="text-sm font-medium">
                {store.rating > 0 ? store.rating.toFixed(1) : "New"}
              </span>
              {store.total_ratings > 0 && (
                <span className="text-xs text-white/80">
                  ({store.total_ratings} ratings)
                </span>
              )}
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                isOpen
                  ? "bg-[var(--success)] text-white"
                  : "bg-white/20 text-white/90"
              }`}
            >
              {isOpen ? "Open" : "Closed"}
            </span>
          </div>
        </div>
      </div>

      {/* Store info */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <MapPin size={14} aria-hidden="true" />
            {store.pickup_area}
          </p>
          {store.description && (
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-lg leading-relaxed">
              {store.description}
            </p>
          )}
          <p className="text-xs text-[var(--text-subtle)] mt-1">
            Run by {store.profile?.full_name || "a fellow student"}
          </p>
        </div>
        {user && user.id !== store.user_id && (
          <button
            type="button"
            onClick={openReport}
            disabled={reporting}
            aria-label="Report this seller"
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-[var(--text-muted)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)]/30 hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
          >
            <Flag size={12} aria-hidden="true" />
            Report
          </button>
        )}
      </div>

      {!isOpen && (
        <div
          role="status"
          className="mb-4 p-3 bg-[var(--warning-soft)] border border-[var(--warning)]/30 rounded-xl text-sm text-[var(--text)]"
        >
          This store is currently closed. You can browse the menu but pre-orders
          are disabled.
        </div>
      )}

      {/* Menu */}
      <SectionHeader
        title="Menu"
        variant="accent-line"
        subtitle={`${items.length} ${items.length === 1 ? "dish" : "dishes"} available`}
      />

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Inbox}
          title="No items listed yet"
          message="Check back later — this seller may be updating their menu."
        />
      )}

      {showReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-store-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close report dialog"
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowReportModal(false);
              setReportReason("");
            }}
          />
          <div className="relative bg-[var(--surface)] rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3
              id="report-store-title"
              className="text-lg font-semibold text-[var(--text)] mb-2"
            >
              Report Seller
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Why are you reporting this seller?
            </p>
            <label htmlFor="report-store-reason" className="sr-only">
              Report reason
            </label>
            <textarea
              id="report-store-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason("");
                }}
                className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-lg transition-colors motion-reduce:transition-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReport}
                disabled={!reportReason.trim() || reporting}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg transition-colors motion-reduce:transition-none disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
