"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { FoodItem, Store, CartItem } from "@/types";
import { Star, ChevronLeft, Heart, Flag, Minus, Plus, Clock } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

export default function ItemDetailPage() {
  const { sellerId, itemId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [item, setItem] = useState<FoodItem | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const { data: itemData } = await supabase
        .from("food_items")
        .select("*")
        .eq("id", itemId)
        .single();

      const { data: storeData } = await supabase
        .from("stores")
        .select("*, profile:profiles!stores_user_id_fkey(full_name)")
        .eq("id", sellerId)
        .single();

      setItem(itemData);
      setStore(storeData);

      if (user && itemData) {
        const { data: fav } = await supabase
          .from("favorites")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("item_id", itemId)
          .single();
        setIsFavorited(!!fav);
      }

      setLoading(false);
    }
    fetchData();
  }, [itemId, sellerId, user]);

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
      alert("You have too many pending orders. Please wait for them to complete.");
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
      alert("Failed to place order. Please try again.");
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

  async function toggleFavorite() {
    if (!user || !item) return;
    if (isFavorited) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", item.id);
      setIsFavorited(false);
    } else {
      await supabase.from("favorites").insert({
        user_id: user.id,
        item_id: item.id,
      });
      setIsFavorited(true);
    }
  }

  async function handleReport() {
    if (!user || !item) return;
    const reason = prompt("Why are you reporting this item?");
    if (!reason) return;
    await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "item",
      target_id: item.id,
      reason,
    });
    alert("Report submitted.");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-sand/30 dark:bg-[#3A2E20] rounded-xl" />
          <div className="h-6 bg-sand/30 dark:bg-[#3A2E20] rounded w-1/3" />
          <div className="h-4 bg-sand/30 dark:bg-[#3A2E20] rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!item || !store) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <span className="text-4xl block mb-3">😕</span>
        <p className="text-bark">Item not found</p>
        <Link href="/feed" className="text-sm text-tomato mt-2 inline-block">
          Back to feed
        </Link>
      </div>
    );
  }

  const photos = item.photo_urls?.length ? item.photo_urls : [];

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <Link
        href={`/feed/${sellerId}`}
        className="inline-flex items-center gap-1 text-sm text-bark hover:text-espresso dark:hover:text-cream mb-4"
      >
        <ChevronLeft size={16} />
        {store.name}
      </Link>

      {/* Photo gallery */}
      <div className="relative rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-tomato/5 to-turmeric/5">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[currentPhoto]}
              alt={item.name}
              className="w-full h-64 md:h-80 object-cover"
            />
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPhoto(i)}
                    className={clsx(
                      "w-2 h-2 rounded-full transition-colors",
                      i === currentPhoto ? "bg-white" : "bg-white/40"
                    )}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-64 md:h-80 flex items-center justify-center text-6xl">
            🍽️
          </div>
        )}

        {item.is_sold_out && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="stamp-sold-out text-lg bg-surface/90 px-4 py-2">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Item info */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-espresso dark:text-cream">
            {item.name}
          </h1>
          <Link
            href={`/feed/${sellerId}`}
            className="text-sm text-bark hover:text-tomato"
          >
            {store.name}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFavorite}
            className="p-2 rounded-lg border border-sand dark:border-[#4A3D30]"
          >
            <Heart
              size={18}
              className={isFavorited ? "fill-chili text-chili" : "text-bark"}
            />
          </button>
          {user && user.id !== store.user_id && (
            <button
              onClick={handleReport}
              className="p-2 rounded-lg border border-sand dark:border-[#4A3D30] text-bark hover:text-chili"
            >
              <Flag size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {item.dietary_tags?.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-herb/10 text-herb text-xs font-medium rounded-full"
          >
            {tag}
          </span>
        ))}
        {item.spice_level > 0 && (
          <span className="px-2 py-0.5 bg-chili/10 text-chili text-xs font-medium rounded-full">
            {"🌶️".repeat(item.spice_level)}
          </span>
        )}
      </div>

      <p className="text-sm text-bark mb-4">{item.description}</p>

      {/* Price */}
      <div className="flex items-center gap-3 mb-6">
        <span className="price-tag text-xl font-bold text-tomato font-mono">
          ৳{item.price.toFixed(0)}
        </span>
        <span className="text-xs text-bark">
          {item.quantity > 0
            ? `${item.quantity} available`
            : "Out of stock"}
        </span>
        {item.average_rating != null && item.average_rating > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <Star size={14} className="fill-turmeric text-turmeric" />
            <span className="text-sm font-medium text-espresso dark:text-cream">
              {item.average_rating.toFixed(1)}
            </span>
            <span className="text-xs text-bark">
              ({item.total_ratings} ratings)
            </span>
          </div>
        )}
      </div>

      {/* Pre-order form */}
      {!item.is_sold_out && user && user.id !== store.user_id && (
        <div className="bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] p-4">
          <h3 className="font-semibold text-sm text-espresso dark:text-cream mb-3">
            Pre-order
          </h3>

          {/* Quantity */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-bark w-20">Quantity</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg border border-sand dark:border-[#4A3D30] flex items-center justify-center text-bark hover:bg-sand/50"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center font-mono font-bold text-espresso dark:text-cream">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(item.quantity, quantity + 1))}
                className="w-8 h-8 rounded-lg border border-sand dark:border-[#4A3D30] flex items-center justify-center text-bark hover:bg-sand/50"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Pickup time */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-bark w-20">
              <Clock size={14} className="inline mr-1" />
              Pickup
            </span>
            <input
              type="text"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              placeholder="e.g. 6 PM today"
              className="flex-1 px-3 py-1.5 bg-cream border border-sand rounded-lg text-sm text-espresso placeholder:text-bark/50 dark:bg-cream-dark dark:border-[#4A3D30] dark:text-cream"
            />
          </div>

          {/* Notes */}
          <div className="mb-3">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requests (e.g. no onions)"
              className="w-full px-3 py-1.5 bg-cream border border-sand rounded-lg text-sm text-espresso placeholder:text-bark/50 dark:bg-cream-dark dark:border-[#4A3D30] dark:text-cream"
            />
          </div>

          {/* Total + button */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-bark">
              Total:{" "}
              <span className="font-bold text-espresso dark:text-cream font-mono">
                ৳{(item.price * quantity).toFixed(0)}
              </span>
            </span>
            <button
              onClick={handlePreOrder}
              disabled={adding || store.is_open === false}
              className="px-6 py-2.5 bg-tomato text-white rounded-xl text-sm font-semibold hover:bg-tomato-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {adding ? "Placing..." : "Pre-order"}
            </button>
          </div>

          {store.is_open === false && (
            <p className="text-xs text-bark/60 mt-2 text-center">
              This store is currently closed
            </p>
          )}
        </div>
      )}

      {!user && (
        <div className="text-center py-6">
          <Link
            href="/"
            className="text-sm text-tomato font-medium hover:underline"
          >
            Sign in to pre-order
          </Link>
        </div>
      )}
    </div>
  );
}
