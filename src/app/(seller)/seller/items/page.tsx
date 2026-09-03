"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { FoodItem, Store } from "@/types";
import { clsx } from "clsx";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Package,
} from "lucide-react";

export default function SellerItemsPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    async function init() {
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", profile!.id)
        .single();

      setStore(storeData);

      if (storeData) {
        const { data: itemsData } = await supabase
          .from("food_items")
          .select("*")
          .eq("store_id", storeData.id)
          .order("created_at", { ascending: false });

        setItems(itemsData || []);
      }

      setLoading(false);
    }

    init();
  }, [profile]);

  async function toggleSoldOut(item: FoodItem) {
    await supabase
      .from("food_items")
      .update({ is_sold_out: !item.is_sold_out })
      .eq("id", item.id);

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_sold_out: !i.is_sold_out } : i
      )
    );
  }

  async function deleteItem(itemId: string) {
    setDeletingId(itemId);

    const { data: item } = await supabase
      .from("food_items")
      .select("photo_urls")
      .eq("id", itemId)
      .single();

    if (item?.photo_urls) {
      for (const url of item.photo_urls) {
        const path = url.split("/food-images/")[1];
        if (path) {
          await supabase.storage.from("food-images").remove([path]);
        }
      }
    }

    await supabase
      .from("item_categories")
      .delete()
      .eq("item_id", itemId);

    await supabase.from("food_items").delete().eq("id", itemId);

    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setDeletingId(null);
  }

  if (!store) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16 text-center">
        <Package size={48} className="mx-auto mb-4 text-bark/30" />
        <p className="text-sm text-bark mb-4">
          Set up your store first to manage items.
        </p>
        <Link
          href="/seller/storefront"
          className="inline-flex px-4 py-2 bg-tomato text-white rounded-full text-sm font-semibold"
        >
          Set Up Store
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-espresso dark:text-cream">
          Items
        </h1>
        <Link
          href="/seller/new-item"
          className="flex items-center gap-1.5 px-4 py-2 bg-tomato text-white rounded-full text-xs font-semibold hover:bg-tomato-hover transition-colors"
        >
          <Plus size={14} />
          New Item
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-sand/30 dark:bg-[#3A2E20] rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={clsx(
                "flex items-center gap-3 p-3 bg-surface dark:bg-surface-dark rounded-xl border border-sand dark:border-[#4A3D30] transition-opacity",
                item.is_sold_out && "opacity-60"
              )}
            >
              <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-sand/30 dark:bg-[#3A2E20]">
                {item.photo_urls?.[0] ? (
                  <img
                    src={item.photo_urls[0]}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    🍽️
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-espresso dark:text-cream truncate">
                    {item.name}
                  </p>
                  {item.is_sold_out && (
                    <span className="px-1.5 py-0.5 bg-chili/10 text-chili text-[10px] font-semibold rounded-full uppercase">
                      Sold Out
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="price-tag text-xs font-mono text-tomato font-bold">
                    ৳{item.price.toFixed(0)}
                  </span>
                  <span className="text-xs text-bark">
                    Qty: {item.quantity}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleSoldOut(item)}
                  className={clsx(
                    "p-2 rounded-lg transition-colors",
                    item.is_sold_out
                      ? "text-herb hover:bg-herb/10"
                      : "text-bark hover:bg-sand/50 dark:hover:bg-[#3A2E20]"
                  )}
                  title={item.is_sold_out ? "Mark available" : "Mark sold out"}
                >
                  {item.is_sold_out ? (
                    <Eye size={16} />
                  ) : (
                    <EyeOff size={16} />
                  )}
                </button>
                <Link
                  href={`/seller/edit/${item.id}`}
                  className="p-2 rounded-lg text-bark hover:bg-sand/50 dark:hover:bg-[#3A2E20] transition-colors"
                  title="Edit item"
                >
                  <Pencil size={16} />
                </Link>
                <button
                  onClick={() => deleteItem(item.id)}
                  disabled={deletingId === item.id}
                  className="p-2 rounded-lg text-chili hover:bg-chili/10 transition-colors disabled:opacity-50"
                  title="Delete item"
                >
                  {deletingId === item.id ? (
                    <div className="h-4 w-4 border-2 border-chili border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Package size={32} className="mx-auto mb-3 text-bark/30" />
          <p className="text-sm text-bark mb-3">No items yet</p>
          <Link
            href="/seller/new-item"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-tomato text-white rounded-full text-sm font-semibold"
          >
            <Plus size={14} />
            Create Your First Item
          </Link>
        </div>
      )}
    </div>
  );
}
