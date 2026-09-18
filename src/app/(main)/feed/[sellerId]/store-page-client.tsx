"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { ItemCard } from "@/components/feed/item-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { ErrorState } from "@/components/ui/error-state";
import { Store, FoodItem } from "@/types";
import { DIETARY_TAGS } from "@/lib/constants";
import {
  Star,
  MapPin,
  Flag,
  ChevronLeft,
  ChevronDown,
  Frown,
  Inbox,
  Info,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/components/ui/toast";
import { ShareButton } from "@/components/ui/share-button";
import { FilterChip } from "@/components/ui/filter-chip";

/**
 * Client island for the seller-store page.
 * Initial store + items data is supplied by the server `page.tsx` wrapper
 * so the server can emit metadata + JSON-LD.
 */
export default function SellerStoreClient({
  initialStore,
  initialItems,
  initialError,
}: {
  initialStore: Store | null;
  initialItems: FoodItem[];
  initialError?: string | null;
}) {
  const { sellerId } = useParams();
  const { user } = useAuth();
  const supabase = useSupabase();
  const [store] = useState<Store | null>(initialStore);
  const [items] = useState<FoodItem[]>(initialItems);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Dietary filter chips — persisted in localStorage, keyed to the store id
  // so a customer's "Vegetarian only" choice in one shop doesn't bleed
  // into another shop's menu.
  const dietaryStorageKey = `cc:diet:${sellerId ?? "unknown"}`;
  const [activeDiets, setActiveDiets] = useState<string[]>([]);
  const [dietaryHydrated, setDietaryHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(dietaryStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setActiveDiets(
            parsed.filter((v): v is string => typeof v === "string")
          );
        }
      }
    } catch {
      // Ignore localStorage failures (Safari private mode etc.).
    }
    setDietaryHydrated(true);
  }, [dietaryStorageKey]);

  useEffect(() => {
    if (!dietaryHydrated) return;
    try {
      window.localStorage.setItem(
        dietaryStorageKey,
        JSON.stringify(activeDiets)
      );
    } catch {
      // Ignore quota / disabled storage.
    }
  }, [dietaryStorageKey, activeDiets, dietaryHydrated]);

  // Only render chips for tags that at least one menu item satisfies.
  const availableDiets = useMemo(() => {
    const present = new Set<string>();
    items.forEach((it) =>
      (it.dietary_tags || []).forEach((t) => present.add(t))
    );
    return DIETARY_TAGS.filter((t) => present.has(t));
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeDiets.length === 0) return items;
    return items.filter((it) =>
      activeDiets.every((tag) => (it.dietary_tags || []).includes(tag))
    );
  }, [items, activeDiets]);

  function toggleDiet(tag: string) {
    setActiveDiets((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

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
  const hasAbout =
    Boolean(store.description) ||
    Boolean(store.pickup_area) ||
    Boolean(store.food_type) ||
    Boolean(store.profile?.full_name);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 animate-fade-in motion-reduce:animate-none">
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
            {store.food_type && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white/90 backdrop-blur-sm">
                {store.food_type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action row (share + report) */}
      <div className="flex items-center justify-end gap-2 mb-4">
        {user && user.id !== store.user_id && (
          <>
            <ShareButton
              title={`${store.name} on CampusCravings`}
              text={`Check out ${store.name} on CampusCravings — homemade food, pickup at ${store.pickup_area}.`}
              path={`/feed/${sellerId}`}
            />
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
          </>
        )}
        {(!user || user.id === store.user_id) && (
          <ShareButton
            title={`${store.name} on CampusCravings`}
            text={`Check out ${store.name} on CampusCravings — homemade food, pickup at ${store.pickup_area}.`}
            path={`/feed/${sellerId}`}
          />
        )}
      </div>

      {/* About this store (collapsible) */}
      {hasAbout && (
        <section
          aria-labelledby="about-store-heading"
          className="mb-6 bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setAboutOpen((v) => !v)}
            aria-expanded={aboutOpen}
            aria-controls="about-store-content"
            className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
          >
            <span className="flex items-center gap-2 text-[var(--text)]">
              <Info
                size={14}
                className="text-[var(--primary)]"
                aria-hidden="true"
              />
              <span
                id="about-store-heading"
                className="text-sm font-semibold"
              >
                About this store
              </span>
            </span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`text-[var(--text-muted)] transition-transform motion-reduce:transition-none ${
                aboutOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {aboutOpen && (
            <div
              id="about-store-content"
              className="px-4 pb-4 space-y-3 border-t border-[var(--border)] pt-3"
            >
              {store.description && (
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {store.description}
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-2">
                {store.pickup_area && (
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={14}
                      className="text-[var(--primary)] mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                        Pickup area
                      </p>
                      <p className="text-sm text-[var(--text)]">
                        {store.pickup_area}
                      </p>
                    </div>
                  </div>
                )}
                {store.food_type && (
                  <div className="flex items-start gap-2">
                    <Utensils
                      size={14}
                      className="text-[var(--primary)] mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                        Cuisine
                      </p>
                      <p className="text-sm text-[var(--text)]">
                        {store.food_type}
                      </p>
                    </div>
                  </div>
                )}
                {store.profile?.full_name && (
                  <div className="flex items-start gap-2">
                    <Star
                      size={14}
                      className="text-[var(--primary)] mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                        Run by
                      </p>
                      <p className="text-sm text-[var(--text)]">
                        {store.profile.full_name}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={`mt-1 inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                      isOpen ? "bg-[var(--success)]" : "bg-[var(--text-subtle)]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                      Status
                    </p>
                    <p className="text-sm text-[var(--text)]">
                      {isOpen ? "Accepting orders" : "Currently closed"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {!store.is_approved && (
        <div
          role="status"
          className="mb-4 p-3 bg-[var(--danger-soft)] border border-[var(--danger)]/30 rounded-xl text-sm text-[var(--text)]"
        >
          <strong className="font-semibold">
            This shop hasn&apos;t been approved yet.
          </strong>{" "}
          You can browse the menu, but pre-orders are disabled until the seller
          is verified.
        </div>
      )}

      {!isOpen && (
        <div
          role="status"
          className="mb-4 p-3 bg-[var(--warning-soft)] border border-[var(--warning)]/30 rounded-xl text-sm text-[var(--text)]"
        >
          This store is currently closed. You can browse the menu but pre-orders
          are disabled.
        </div>
      )}

      {store.is_approved && isOpen && items.length === 0 && (
        <div
          role="status"
          className="mb-4 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-muted)]"
        >
          The kitchen&apos;s quiet right now — this seller has no active items
          on the menu. Check back soon.
        </div>
      )}

      {/* Menu */}
      <SectionHeader
        title="Menu"
        variant="accent-line"
        subtitle={
          activeDiets.length > 0
            ? `Showing ${filteredItems.length} of ${items.length} ${items.length === 1 ? "dish" : "dishes"} matching your filters`
            : `${items.length} ${items.length === 1 ? "dish" : "dishes"} available`
        }
        rightSlot={
          availableDiets.length > 0 ? (
            <button
              type="button"
              onClick={() => setActiveDiets([])}
              disabled={activeDiets.length === 0}
              aria-label="Clear dietary filters"
              className="text-xs font-medium text-[var(--primary)] hover:underline motion-reduce:transition-none disabled:opacity-0 disabled:pointer-events-none"
            >
              Clear filters
            </button>
          ) : null
        }
      />

      {availableDiets.length > 0 && (
        <div
          role="group"
          aria-label="Dietary filters"
          className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1 scrollbar-thin"
        >
          {availableDiets.map((tag) => (
            <FilterChip
              key={tag}
              label={tag}
              isActive={activeDiets.includes(tag)}
              onClick={() => toggleDiet(tag)}
            />
          ))}
        </div>
      )}

      {error ? (
        <ErrorState
          error={error}
          title="Couldn't load this menu"
          onRetry={() => {
            setError(null);
            if (typeof window !== "undefined") window.location.reload();
          }}
        />
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No items listed yet"
          message="Check back later — this seller may be updating their menu."
        />
      ) : (
        <EmptyState
          icon={Inbox}
          title="No items match your filters"
          message="Try clearing your dietary filters to see more of the menu."
          ctaLabel="Clear filters"
          ctaHref="#"
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
