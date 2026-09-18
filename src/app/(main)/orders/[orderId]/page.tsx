"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { Order, OrderStatus, Review } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";

import Link from "next/link";
import {
  ChevronLeft,
  Star,
  MapPin,
  Clock,
  FileText,
  MessageSquare,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get("just_placed") === "1";
  const { user } = useAuth();
  const supabase = useSupabase();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [showJustPlaced, setShowJustPlaced] = useState(justPlaced);

  useEffect(() => {
    async function fetchOrder() {
      const { data } = await supabase
        .from("orders")
        .select("*, store:stores!orders_store_id_fkey(name, pickup_area, user_id), items:order_items(*, item:food_items(name, photo_urls, price))")
        .eq("id", orderId)
        .single();

      setOrder(data);

      if (data?.status === "completed") {
        const { data: review } = await supabase
          .from("reviews")
          .select("*")
          .eq("order_id", orderId)
          .single();
        setExistingReview(review);
      }

      setLoading(false);
    }
    fetchOrder();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  async function submitReview() {
    if (!user || !order) return;
    await supabase.from("reviews").insert({
      order_id: order.id,
      user_id: user.id,
      store_id: order.store_id,
      rating,
      comment: comment || null,
    });
    setExistingReview({
      id: "new",
      order_id: order.id,
      user_id: user.id,
      store_id: order.store_id,
      rating,
      comment,
      created_at: new Date().toISOString(),
    });
    setShowReview(false);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-4" aria-label="Loading order" role="status">
        <Skeleton className="h-8 w-1/3 rounded-lg mb-4" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">Order not found</p>
        <Link href="/orders" className="text-sm text-[var(--primary)] mt-2 inline-block hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  const statusSteps: OrderStatus[] = ["requested", "accepted", "ready", "completed"];
  const currentStepIndex = statusSteps.indexOf(order.status as OrderStatus);
  const isDeclined = order.status === "declined";

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors motion-reduce:transition-none"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        My Orders
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text)]">
          Order Details
        </h1>
        <span
          className={clsx(
            "px-3 py-1 rounded-full text-xs font-semibold",
            ORDER_STATUSES[order.status as OrderStatus]?.color
          )}
        >
          {ORDER_STATUSES[order.status as OrderStatus]?.label}
        </span>
      </div>

      {/* Confirmation banner — shown once after cart → orders redirect. */}
      {showJustPlaced && (
        <div
          role="status"
          className="mb-4 p-4 bg-[var(--success-soft)] border border-[var(--success)]/30 rounded-2xl flex items-start gap-3 animate-fade-in"
        >
          <div
            aria-hidden="true"
            className="shrink-0 w-9 h-9 rounded-full bg-[var(--success)] text-white flex items-center justify-center"
          >
            <CheckCircle2 size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text)]">
              Order placed — you&apos;re all set!
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              We&apos;ve notified the seller. You&apos;ll see status updates
              here as they confirm your pickup time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowJustPlaced(false)}
            aria-label="Dismiss"
            className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ETA card — shown when order is accepted/ready */}
      {(order.status === "accepted" || order.status === "ready") &&
        order.pickup_time && (
          <div className="mb-4 p-4 bg-[var(--primary-soft)] border border-[var(--primary)]/20 rounded-2xl flex items-start gap-3">
            <Sparkles
              size={18}
              className="text-[var(--primary)] mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text)]">
                {order.status === "ready"
                  ? "Ready for pickup now!"
                  : `Pickup around ${order.pickup_time}`}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Pay in cash when you arrive. Have your order number handy.
              </p>
            </div>
          </div>
        )}

      {/* Stepper */}
      {!isDeclined && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mb-4">
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <div key={step} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      isCompleted
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--background)] text-[var(--text-muted)]"
                    )}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={clsx(
                        "step-connector h-8",
                        isCompleted && index < currentStepIndex ? "active" : ""
                      )}
                    />
                  )}
                </div>
                <div className="pt-0.5">
                  <p
                    className={clsx(
                      "text-sm font-medium",
                      isCurrent
                        ? "text-[var(--primary)]"
                        : isCompleted
                          ? "text-[var(--text)]"
                          : "text-[var(--text-muted)]"
                    )}
                  >
                    {ORDER_STATUSES[step]?.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {step === "requested" && "Waiting for seller to respond"}
                      {step === "accepted" && "Seller accepted your order"}
                      {step === "ready" && "Ready for pickup!"}
                      {step === "completed" && "Order completed"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isDeclined && (
        <div className="bg-[var(--danger)]/5 border border-[var(--danger)]/20 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-[var(--danger)] mb-1">Order Declined</p>
          {order.decline_reason && (
            <p className="text-xs text-[var(--text-muted)]">{order.decline_reason}</p>
          )}
        </div>
      )}

      {/* Order info */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h2 className="font-semibold text-sm text-[var(--text)]">
            {order.store?.name}
          </h2>
          <Link
            href={`/feed/${order.store_id}`}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            View store
          </Link>
          <Link
            href={`/orders/${orderId}/messages`}
            className="text-xs text-[var(--primary)] hover:underline inline-flex items-center gap-1"
          >
            <MessageSquare size={11} aria-hidden="true" />
            Message seller
          </Link>
        </div>

        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3">
          <span className="flex items-center gap-1">
            <MapPin size={12} aria-hidden="true" />
            {order.store?.pickup_area}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            Pickup: {order.pickup_time}
          </span>
        </div>

        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          {order.items?.map((oi) => (
            <div key={oi.id} className="flex items-center justify-between text-sm">
              <span className="text-[var(--text)]">
                {oi.quantity}x {oi.item?.name}
              </span>
              <span className="font-mono text-[var(--text-muted)]">
                ৳{(oi.price_at_time * oi.quantity).toFixed(0)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 mt-3">
          <span className="text-sm font-medium text-[var(--text-muted)]">Total</span>
          <span className="text-lg font-bold font-mono text-[var(--primary)]">
            ৳{order.total_price.toFixed(0)}
          </span>
        </div>

        {order.notes && (
          <p className="text-xs text-[var(--text-muted)] mt-3 bg-[var(--background)] p-2 rounded-lg flex items-center gap-1.5">
            <FileText size={12} className="shrink-0" aria-hidden="true" />
            {order.notes}
          </p>
        )}
      </div>

      {/* Review */}
      {order.status === "completed" && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          {existingReview ? (
            <div>
              <p className="text-sm font-medium text-[var(--text)] mb-2">
                Your Review
              </p>
              <div className="flex items-center gap-1 mb-1" aria-label={`Rated ${existingReview.rating} out of 5`}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < existingReview.rating
                        ? "fill-amber-500 text-amber-500"
                        : "text-[var(--border)]"
                    }
                    aria-hidden="true"
                  />
                ))}
              </div>
              {existingReview.comment && (
                <p className="text-xs text-[var(--text-muted)]">{existingReview.comment}</p>
              )}
            </div>
          ) : showReview ? (
            <div>
              <p className="text-sm font-medium text-[var(--text)] mb-3">
                Rate your experience
              </p>
              <div className="flex items-center gap-1 mb-3" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={rating === s}
                    aria-label={`${s} star${s === 1 ? "" : "s"}`}
                    onClick={() => setRating(s)}
                  >
                    <Star
                      size={24}
                      className={
                        s <= rating
                          ? "fill-amber-500 text-amber-500"
                          : "text-[var(--border)] hover:text-amber-500/50"
                      }
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell others about your experience..."
                rows={3}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submitReview}
                  className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
                >
                  Submit Review
                </button>
                <button
                  type="button"
                  onClick={() => setShowReview(false)}
                  className="px-4 py-2 text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors motion-reduce:transition-none"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowReview(true)}
              className="w-full py-2.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)]/30 hover:text-[var(--primary)] transition-colors motion-reduce:transition-none flex items-center justify-center gap-2"
            >
              <Star size={16} aria-hidden="true" />
              Rate this order
            </button>
          )}
        </div>
      )}
    </div>
  );
}
