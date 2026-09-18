"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FoodItem, Store } from "@/types";
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
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { toast } from "@/components/ui/toast";

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
}: {
  initialItem: FoodItem | null;
  initialStore: Store | null;
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

  async function handleReport() {
    if (!user || !item) return;
    setShowReportModal(true);
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

  const photos = item.photo_urls?.length ? item.photo_urls : [];

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <Link
        href={`/feed/${sellerId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors motion-reduce:transition-none"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        {store.name}
      </Link>

      {/* Photo gallery */}
      <div className="relative rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)]">
        {photos.length > 0 ? (
          <>
            <Image
              src={photos[currentPhoto]}
              alt={item.name}
              width={800}
              height={320}
              className="w-full h-64 md:h-80 object-cover"
              sizes="100vw"
              priority
            />
            {photos.length > 1 && (
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
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="stamp-sold-out text-lg bg-white/95 px-4 py-2">
              Sold Out
            </span>
          </div>
        )}
      </div>

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
      {!item.is_sold_out && user && user.id !== store.user_id && (
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
              className="flex-1 px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors"
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
              className="w-full px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-colors"
            />
          </div>

          {/* Total + buttons */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-[var(--text-muted)]">
              Total:{" "}
              <span className="font-bold text-[var(--text)] font-mono">
                ৳{(item.price * quantity).toFixed(0)}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
            <p className="text-xs text-[var(--text-subtle)] mt-1 text-center">
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
    </div>
  );
}
