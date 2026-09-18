"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { ItemCard } from "@/components/feed/item-card";
import { recordRecent } from "@/lib/recently-viewed";
import { FoodItem, Store, Review } from "@/types";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Heart,
  Flag,
  Clock,
  Frown,
  Utensils,
  Flame,
  ShoppingBag,
  X,
  MessageSquareQuote,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { toast } from "@/components/ui/toast";

interface ItemReview
  extends Omit<Review, "user"> {
  user?: { full_name: string; avatar_url: string | null };
}

/**
 * Client island for the item-detail page.
 * Initial data is passed in by the server `page.tsx` wrapper so the server
 * can emit metadata + JSON-LD without this component needing to be a server
 * component itself. Auth-gated data (favorites) is still re-fetched here
 * because the server can't read the user's session cookie reliably for RSC.
 */
export default function ItemDetailClient({
  initialItem,
  initialStore,
  initialRelatedItems,
  initialReviews,
}: {
  initialItem: FoodItem | null;
  initialStore: Store | null;
  initialRelatedItems?: FoodItem[];
  initialReviews?: unknown[];
}) {
  const { sellerId, itemId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const { add } = useCart();

  const [item] = useState<FoodItem | null>(initialItem);
  const [store] = useState<Store | null>(initialStore);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [reportReason, setReportReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Related items & reviews are seeded from the server so the page renders
  // fully on first paint. The state still allows future client refreshes.
  const [relatedItems] = useState<FoodItem[]>(initialRelatedItems ?? []);
  const [reviews] = useState<ItemReview[]>(
    (initialReviews as ItemReview[] | undefined) ?? []
  );

  const galleryRef = useRef<HTMLDivElement | null>(null);

  const photos = item?.photo_urls?.length ? item.photo_urls : [];
  const hasMultiplePhotos = photos.length > 1;

  useEffect(() => {
    // Re-fetch favorites once the user is known (cookie may be missing on SSR).
    if (!user || !item) return;
    let cancelled = false;
    supabase
      .from("favorites")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsFavorited(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, user, item, supabase]);

  // Record this visit in the "Recently viewed" carousel on the feed.
  // Runs even for signed-out visitors (localStorage only) and is guarded
  // by `typeof window` inside `recordRecent`.
  useEffect(() => {
    if (!item || !store) return;
    recordRecent({
      id: item.id,
      name: item.name,
      photo_url: item.photo_urls?.[0] ?? null,
      store_id: store.id,
      store_name: store.name,
    });
  }, [item, store]);

  // Keyboard navigation for the gallery (only when gallery or fullscreen is focused).
  useEffect(() => {
    function isGalleryFocused() {
      if (!galleryRef.current) return false;
      return galleryRef.current.contains(document.activeElement);
    }
    function onKey(e: KeyboardEvent) {
      if (fullscreen) {
        if (e.key === "Escape") {
          setFullscreen(false);
          return;
        }
      }
      if (!hasMultiplePhotos) return;
      if (!isGalleryFocused() && !fullscreen) return;
      if (e.key === "ArrowLeft") {
        setCurrentPhoto((i) => (i - 1 + photos.length) % photos.length);
      } else if (e.key === "ArrowRight") {
        setCurrentPhoto((i) => (i + 1) % photos.length);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hasMultiplePhotos, photos.length, fullscreen]);

  async function handlePreOrder() {
    if (!user || !item || !store) return;
    setAdding(true);

    // Check pending orders limit
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .in("status", ["requested", "accepted"]);

    if (count && count >= 3) {
      toast("You have too many pending orders. Please wait for them to complete.", "error");
      setAdding(false);
      return;
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        store_id: store.id,
        total_price: item.price * quantity,
        pickup_time: pickupTime || "Flexible",
        notes: notes || null,
      })
      .select()
      .single();

    if (orderError || !order) {
      toast("Failed to place order. Please try again.", "error");
      setAdding(false);
      return;
    }

    // Add order item
    await supabase.from("order_items").insert({
      order_id: order.id,
      item_id: item.id,
      quantity,
      price_at_time: item.price,
    });

    // Notify seller
    await supabase.from("notifications").insert({
      user_id: store.user_id,
      title: "New Order!",
      message: `${user.email} pre-ordered ${quantity}x ${item.name}`,
      link: `/seller/orders`,
    });

    // Update quantity
    await supabase
      .from("food_items")
      .update({ quantity: Math.max(0, item.quantity - quantity) })
      .eq("id", item.id);

    if (item.quantity - quantity <= 0) {
      await supabase
        .from("food_items")
        .update({ is_sold_out: true })
        .eq("id", item.id);
    }

    setAdding(false);
    router.push(`/orders/${order.id}`);
  }

  function handleAddToCart() {
    if (!item || !store) return;
    add({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity,
      store_id: store.id,
      store_name: store.name,
      notes: notes || "",
      photo_url: item.photo_urls?.[0] ?? null,
    });
    toast(`Added ${quantity}× ${item.name} to cart`, "success");
  }

  async function toggleFavorite() {
    if (!user || !item) return;

    const wasFavorited = isFavorited;
    setIsFavorited(!wasFavorited);

    try {
      if (wasFavorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, item_id: item.id });
        if (error) throw error;
      }
    } catch {
      setIsFavorited(wasFavorited);
      toast("Failed to update favorite", "error");
    }
  }

  async function submitReport() {
    if (!user || !item || !reportReason.trim()) return;
    setShowReportModal(false);
    await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "item",
      target_id: item.id,
      reason: reportReason.trim(),
    });
    setReportReason("");
    toast("Report submitted.", "success");
  }

  if (!item || !store) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <EmptyState
          icon={Frown}
          title="Item not found"
          message="This dish may have been removed or is no longer available."
          ctaLabel="Browse the feed"
          ctaHref="/feed"
        />
      </div>
    );
  }

  const canPreOrder =
    !item.is_sold_out && user && user.id !== store.user_id;
  const showStickyCart = canPreOrder && store.is_open !== false;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 pb-32 md:pb-8">
      <Link
        href={`/feed/${sellerId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors motion-reduce:transition-none"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        {store.name}
      </Link>

      {/* Photo gallery */}
      <div
        ref={galleryRef}
        tabIndex={hasMultiplePhotos ? 0 : -1}
        role={hasMultiplePhotos ? "region" : undefined}
        aria-label={
          hasMultiplePhotos
            ? "Item photo gallery. Use left and right arrow keys to navigate."
            : "Item photo"
        }
        className="relative rounded-xl overflow-hidden mb-2 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
      >
        {photos.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => hasMultiplePhotos && setFullscreen(true)}
              className="block w-full cursor-zoom-in"
              aria-label="Open photo fullscreen"
            >
              <Image
                key={photos[currentPhoto]}
                src={photos[currentPhoto]}
                alt={`${item.name} — photo ${currentPhoto + 1} of ${photos.length}`}
                width={800}
                height={320}
                className="w-full h-64 md:h-80 object-cover"
                sizes="100vw"
                priority
              />
            </button>
            {hasMultiplePhotos && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() =>
                    setCurrentPhoto((i) => (i - 1 + photos.length) % photos.length)
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors motion-reduce:transition-none"
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => setCurrentPhoto((i) => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors motion-reduce:transition-none"
                >
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
                <div
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5"
                  role="tablist"
                  aria-label="Photo gallery"
                >
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      role="tab"
                      aria-selected={i === currentPhoto}
                      aria-label={`Show photo ${i + 1} of ${photos.length}`}
                      onClick={() => setCurrentPhoto(i)}
                      className={clsx(
                        "w-2 h-2 rounded-full transition-all motion-reduce:transition-none",
                        i === currentPhoto ? "bg-white w-6" : "bg-white/40"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-64 md:h-80 flex items-center justify-center">
            <Utensils size={48} className="text-[var(--text-subtle)]" aria-hidden="true" />
          </div>
        )}

        {item.is_sold_out && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
            <span className="stamp-sold-out text-lg bg-white/95 px-4 py-2">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultiplePhotos && (
        <div
          className="flex gap-2 mb-4 overflow-x-auto"
          role="tablist"
          aria-label="Photo thumbnails"
        >
          {photos.map((src, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === currentPhoto}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              onClick={() => setCurrentPhoto(i)}
              className={clsx(
                "shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors motion-reduce:transition-none",
                i === currentPhoto
                  ? "border-[var(--primary)]"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={src}
                alt=""
                width={64}
                height={64}
                className="w-full h-full object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen viewer */}
      {fullscreen && photos.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-[120] bg-black flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            aria-label="Close photo viewer"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors motion-reduce:transition-none"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(false);
            }}
          >
            <X size={22} />
          </button>
          {hasMultiplePhotos && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhoto((i) => (i - 1 + photos.length) % photos.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors motion-reduce:transition-none"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhoto((i) => (i + 1) % photos.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors motion-reduce:transition-none"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}
          <div
            className="relative w-full h-full max-w-4xl max-h-[85vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              key={photos[currentPhoto]}
              src={photos[currentPhoto]}
              alt={`${item.name} — photo ${currentPhoto + 1} of ${photos.length}`}
              width={1200}
              height={800}
              className="w-full h-full object-contain"
              sizes="100vw"
              priority
            />
          </div>
          {hasMultiplePhotos && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 px-3 py-1 rounded-full">
              {currentPhoto + 1} / {photos.length}
            </div>
          )}
        </div>
      )}

      {/* Item info */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">{item.name}</h1>
          <Link
            href={`/feed/${sellerId}`}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
          >
            {store.name}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={isFavorited ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
            aria-pressed={isFavorited}
            className="p-2 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] transition-colors motion-reduce:transition-none"
          >
            <Heart
              size={18}
              className={isFavorited ? "fill-[var(--primary)] text-[var(--primary)]" : "text-[var(--text-muted)]"}
              aria-hidden="true"
            />
          </button>
          {user && user.id !== store.user_id && (
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              aria-label="Report this item"
              className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors motion-reduce:transition-none"
            >
              <Flag size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4" aria-label="Dietary tags">
        {item.dietary_tags?.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-[var(--success-soft)] text-[var(--success)] text-xs font-medium rounded-full"
          >
            {tag}
          </span>
        ))}
        {item.spice_level > 0 && (
          <span
            className="px-2 py-0.5 bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-medium rounded-full inline-flex items-center gap-0.5"
            aria-label={`Spice level ${item.spice_level} of 3`}
          >
            {Array.from({ length: item.spice_level }).map((_, i) => (
              <Flame key={i} size={12} className="fill-current" aria-hidden="true" />
            ))}
          </span>
        )}
      </div>

      <p className="text-sm text-[var(--text-muted)] mb-4">{item.description}</p>

      {/* Price */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="price-tag text-xl font-bold text-[var(--primary)] font-mono">
          ৳{Number(item.price).toFixed(0)}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {item.quantity > 0 ? `${item.quantity} available` : "Out of stock"}
        </span>
        {item.average_rating != null && item.average_rating > 0 && (
          <div
            className="flex items-center gap-1 ml-auto"
            aria-label={`Rated ${item.average_rating.toFixed(1)} out of 5`}
          >
            <Star size={14} className="fill-amber-500 text-amber-500" aria-hidden="true" />
            <span className="text-sm font-medium text-[var(--text)]">
              {item.average_rating.toFixed(1)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              ({item.total_ratings} ratings)
            </span>
          </div>
        )}
      </div>

      {/* Pre-order form */}
      {canPreOrder && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 space-y-3">
          <h3 className="font-semibold text-sm text-[var(--text)]">Pre-order</h3>

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <label
              htmlFor="item-quantity"
              className="text-sm font-medium text-[var(--text-muted)]"
            >
              Quantity
            </label>
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={Math.max(1, item.quantity)}
              label={`${item.name} quantity`}
            />
          </div>

          {/* Pickup time */}
          <div className="flex items-center gap-3">
            <label htmlFor="pickup-time" className="text-sm font-medium text-[var(--text-muted)] w-20">
              <Clock size={14} className="inline mr-1" aria-hidden="true" />
              Pickup
            </label>
            <input
              id="pickup-time"
              type="text"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              placeholder="e.g. 6 PM today"
              className="flex-1 px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors motion-reduce:transition-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="order-notes" className="sr-only">
              Special instructions
            </label>
            <input
              id="order-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requests (e.g. no onions)"
              className="w-full px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors motion-reduce:transition-none"
            />
          </div>

          {/* Total + buttons (md+ only; mobile uses sticky bar below) */}
          <div className="hidden md:flex items-center justify-between pt-2">
            <span className="text-sm text-[var(--text-muted)]">
              Total:{" "}
              <span className="font-bold text-[var(--text)] font-mono">
                ৳{(item.price * quantity).toFixed(0)}
              </span>
            </span>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={store.is_open === false}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--surface-elev)] text-[var(--text)] border border-[var(--border)] rounded-xl text-sm font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none disabled:opacity-50"
            >
              <ShoppingBag size={16} aria-hidden="true" />
              Add to cart
            </button>
            <button
              type="button"
              onClick={handlePreOrder}
              disabled={adding || store.is_open === false}
              className="px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none disabled:opacity-50"
            >
              {adding ? "Placing..." : "Buy now"}
            </button>
          </div>

          {store.is_open === false && (
            <p className="hidden md:block text-xs text-[var(--text-subtle)] mt-1 text-center">
              This store is currently closed
            </p>
          )}
        </div>
      )}

      {!user && (
        <div className="text-center py-6">
          <Link
            href="/"
            className="text-sm text-[var(--primary)] font-medium hover:underline"
          >
            Sign in to pre-order
          </Link>
        </div>
      )}

      {item.is_sold_out && (
        <div
          role="status"
          className="mt-4 p-3 bg-[var(--warning-soft)] border border-[var(--warning)]/30 rounded-xl text-sm text-[var(--text)]"
        >
          This dish is currently sold out. Check back later.
        </div>
      )}

      {/* Reviews preview */}
      {reviews && reviews.length > 0 && (        <section className="mt-8" aria-labelledby="reviews-heading">
          <SectionHeader
            id="reviews-heading"
            title="Recent reviews"
            variant="accent-line"
            subtitle={`${reviews.length} ${
              reviews.length === 1 ? "review" : "reviews"
            }`}
          />
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] font-semibold text-sm overflow-hidden shrink-0"
                    aria-hidden="true"
                  >
                    {r.user?.avatar_url ? (
                      <Image
                        src={r.user.avatar_url}
                        alt=""
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (r.user?.full_name || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text)] truncate">
                      {r.user?.full_name || "Customer"}
                    </p>
                    <div
                      className="flex items-center gap-0.5"
                      aria-label={`Rated ${r.rating} out of 5`}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={clsx(
                            i < r.rating
                              ? "fill-amber-500 text-amber-500"
                              : "text-[var(--border)]"
                          )}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {r.comment ? (
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    {r.comment}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--text-subtle)] italic inline-flex items-center gap-1">
                    <MessageSquareQuote size={12} aria-hidden="true" />
                    No comment left.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related items */}
      {relatedItems && relatedItems.length > 0 && (
        <section className="mt-8" aria-labelledby="related-heading">
          <SectionHeader
            id="related-heading"
            title="More from this store"
            variant="accent-line"
            subtitle={`${relatedItems.length} ${
              relatedItems.length === 1 ? "item" : "items"
            }`}
            rightSlot={
              <Link
                href={`/feed/${sellerId}`}
                className="text-xs font-medium text-[var(--primary)] hover:underline"
              >
                View store
              </Link>
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {relatedItems.map((it) => (
              <ItemCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      )}

      {showReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-item-title"
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
              id="report-item-title"
              className="text-lg font-semibold text-[var(--text)] mb-2"
            >
              Report Item
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Why are you reporting this item?
            </p>
            <label htmlFor="report-item-reason" className="sr-only">
              Report reason
            </label>
            <textarea
              id="report-item-reason"
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
                disabled={!reportReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg transition-colors motion-reduce:transition-none disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Add to cart bar (mobile only) */}
      {showStickyCart && (
        <div
          className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
          role="region"
          aria-label="Quick add to cart"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-bold text-[var(--text)] tabular-nums">
                ৳{(item.price * quantity).toFixed(0)}
              </span>
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                max={Math.max(1, item.quantity)}
                label={`${item.name} quantity`}
                size="sm"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--surface-elev)] text-[var(--text)] border border-[var(--border)] rounded-xl text-sm font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
                aria-label="Add to cart"
              >
                <ShoppingBag size={14} aria-hidden="true" />
                Cart
              </button>
              <button
                type="button"
                onClick={handlePreOrder}
                disabled={adding}
                className="inline-flex items-center justify-center px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none disabled:opacity-50"
              >
                {adding ? "..." : "Buy now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
