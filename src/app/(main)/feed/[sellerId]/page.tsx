"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { ItemCard } from "@/components/feed/item-card";
import { Store, FoodItem } from "@/types";
import { Star, MapPin, Flag, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function SellerStorePage() {
  const { sellerId } = useParams();
  const { user } = useAuth();
  const supabase = createClient();
  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: storeData } = await supabase
        .from("stores")
        .select("*, profile:profiles!stores_user_id_fkey(full_name, avatar_url)")
        .eq("id", sellerId)
        .single();

      setStore(storeData);

      if (storeData) {
        const { data: itemsData } = await supabase
          .from("food_items")
          .select("*")
          .eq("store_id", sellerId)
          .order("created_at", { ascending: false });

        setItems(itemsData || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [sellerId]);

  async function handleReport() {
    if (!user || reporting) return;
    const reason = prompt("Why are you reporting this seller?");
    if (!reason) return;

    setReporting(true);
    await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "store",
      target_id: sellerId as string,
      reason,
    });
    setReporting(false);
    alert("Report submitted. Thank you.");
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-sand/30 dark:bg-[#3A2E20] rounded-xl" />
          <div className="h-6 bg-sand/30 dark:bg-[#3A2E20] rounded w-1/3" />
          <div className="h-4 bg-sand/30 dark:bg-[#3A2E20] rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 text-center">
        <span className="text-4xl block mb-3">😕</span>
        <p className="text-bark">Store not found</p>
        <Link href="/feed" className="text-sm text-tomato mt-2 inline-block">
          Back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
      {/* Back button */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-1 text-sm text-bark hover:text-espresso dark:hover:text-cream mb-4"
      >
        <ChevronLeft size={16} />
        Back
      </Link>

      {/* Cover */}
      <div className="relative h-48 rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-tomato/10 to-turmeric/10">
        {store.photo_url ? (
          <img
            src={store.photo_url}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            🍳
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{store.name}</h1>
            {store.is_approved && (
              <span className="text-turmeric" title="Verified Seller">✓</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Star size={14} className="fill-turmeric text-turmeric" />
              <span className="text-sm text-white font-medium">
                {store.rating > 0 ? store.rating.toFixed(1) : "New"}
              </span>
              {store.total_ratings > 0 && (
                <span className="text-xs text-white/70">
                  ({store.total_ratings} ratings)
                </span>
              )}
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                store.is_open
                  ? "bg-herb text-white"
                  : "bg-white/20 text-white/80"
              }`}
            >
              {store.is_open ? "Open" : "Closed"}
            </span>
          </div>
        </div>
      </div>

      {/* Store info */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-bark">
            <MapPin size={14} />
            {store.pickup_area}
          </p>
          {store.description && (
            <p className="text-sm text-bark mt-1 max-w-lg">
              {store.description}
            </p>
          )}
          <p className="text-xs text-bark/50 mt-1">
            Run by {store.profile?.full_name || "a fellow student"}
          </p>
        </div>
        {user && user.id !== store.user_id && (
          <button
            onClick={handleReport}
            disabled={reporting}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-bark border border-sand rounded-lg hover:border-chili/30 hover:text-chili transition-colors dark:border-[#4A3D30]"
          >
            <Flag size={12} />
            Report
          </button>
        )}
      </div>

      {/* Items */}
      <div className="mb-4">
        <h2 className="accent-line text-lg font-bold text-espresso dark:text-cream mb-4">
          Menu
        </h2>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="text-3xl mb-2 block">📭</span>
          <p className="text-sm text-bark">No items listed yet</p>
        </div>
      )}
    </div>
  );
}
