"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { Order, OrderStatus, Review } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";
import { ChevronLeft, Star, MapPin, Clock } from "lucide-react";
import { clsx } from "clsx";

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [existingReview, setExistingReview] = useState<Review | null>(null);

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
  }, [orderId]);

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
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-sand/30 dark:bg-[#3A2E20] rounded w-1/3" />
          <div className="h-40 bg-sand/30 dark:bg-[#3A2E20] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-bark">Order not found</p>
        <Link href="/orders" className="text-sm text-tomato mt-2 inline-block">
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
        className="inline-flex items-center gap-1 text-sm text-bark hover:text-espresso dark:hover:text-cream mb-4"
      >
        <ChevronLeft size={16} />
        My Orders
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-espresso dark:text-cream">
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

      {/* Stepper */}
      {!isDeclined && (
        <div className="bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] p-4 mb-4">
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
                        ? "bg-tomato text-white"
                        : "bg-sand dark:bg-[#3A2E20] text-bark"
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
                        ? "text-tomato"
                        : isCompleted
                        ? "text-espresso dark:text-cream"
                        : "text-bark"
                    )}
                  >
                    {ORDER_STATUSES[step]?.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-bark mt-0.5">
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
        <div className="bg-chili/5 border border-chili/20 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-chili mb-1">Order Declined</p>
          {order.decline_reason && (
            <p className="text-xs text-bark">{order.decline_reason}</p>
          )}
        </div>
      )}

      {/* Order info */}
      <div className="bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold text-sm text-espresso dark:text-cream">
            {order.store?.name}
          </h2>
          <Link
            href={`/feed/${order.store_id}`}
            className="text-xs text-tomato hover:underline"
          >
            View Store
          </Link>
        </div>

        <div className="flex items-center gap-4 text-xs text-bark mb-3">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {order.store?.pickup_area}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Pickup: {order.pickup_time}
          </span>
        </div>

        <div className="space-y-2 border-t border-sand dark:border-[#4A3D30] pt-3">
          {order.items?.map((oi) => (
            <div key={oi.id} className="flex items-center justify-between text-sm">
              <span className="text-espresso dark:text-cream">
                {oi.quantity}x {oi.item?.name}
              </span>
              <span className="font-mono text-bark">
                ৳{(oi.price_at_time * oi.quantity).toFixed(0)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-sand dark:border-[#4A3D30] pt-3 mt-3">
          <span className="text-sm font-medium text-bark">Total</span>
          <span className="text-lg font-bold font-mono text-tomato">
            ৳{order.total_price.toFixed(0)}
          </span>
        </div>

        {order.notes && (
          <p className="text-xs text-bark mt-3 bg-cream dark:bg-cream-dark p-2 rounded-lg">
            📝 {order.notes}
          </p>
        )}
      </div>

      {/* Review */}
      {order.status === "completed" && (
        <div className="bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] p-4">
          {existingReview ? (
            <div>
              <p className="text-sm font-medium text-espresso dark:text-cream mb-2">
                Your Review
              </p>
              <div className="flex items-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < existingReview.rating
                        ? "fill-turmeric text-turmeric"
                        : "text-sand"
                    }
                  />
                ))}
              </div>
              {existingReview.comment && (
                <p className="text-xs text-bark">{existingReview.comment}</p>
              )}
            </div>
          ) : showReview ? (
            <div>
              <p className="text-sm font-medium text-espresso dark:text-cream mb-3">
                Rate your experience
              </p>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)}>
                    <Star
                      size={24}
                      className={
                        s <= rating
                          ? "fill-turmeric text-turmeric"
                          : "text-sand hover:text-turmeric/50"
                      }
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell others about your experience..."
                rows={3}
                className="w-full px-3 py-2 bg-cream border border-sand rounded-lg text-sm text-espresso placeholder:text-bark/50 dark:bg-cream-dark dark:border-[#4A3D30] dark:text-cream mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitReview}
                  className="px-4 py-2 bg-tomato text-white rounded-lg text-sm font-semibold hover:bg-tomato-hover"
                >
                  Submit Review
                </button>
                <button
                  onClick={() => setShowReview(false)}
                  className="px-4 py-2 text-bark text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReview(true)}
              className="w-full py-2.5 border border-sand dark:border-[#4A3D30] rounded-lg text-sm font-medium text-bark hover:border-tomato/30 hover:text-tomato transition-colors"
            >
              ⭐ Rate this order
            </button>
          )}
        </div>
      )}
    </div>
  );
}
