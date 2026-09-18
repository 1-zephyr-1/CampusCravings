"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { FoodItem, Store } from "@/types";
import { clsx } from "clsx";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Package,
  Utensils,
  Store as StoreIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export default function SellerItemsPage() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
  }, [profile, supabase]);

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

    await supabase.from("item_categories").delete().eq("item_id", itemId);
    await supabase.from("food_items").delete().eq("id", itemId);

    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setDeletingId(null);
  }

  if (!store) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <EmptyState
          icon={StoreIcon}
          title="Set up your store first"
          message="Create your storefront so buyers can find you on the feed."
          ctaLabel="Set up store"
          ctaHref="/seller/storefront"
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text)]">Items</h1>
        <Link
          href="/seller/new-item"
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white rounded-full text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors motion-reduce:transition-none"
        >
          <Plus size={14} aria-hidden="true" />
          New item
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2" aria-label="Loading items" role="status">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <ul role="list" className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={clsx(
                "flex items-center gap-3 p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)] transition-opacity motion-reduce:transition-none",
                item.is_sold_out && "opacity-60"
              )}
            >
              <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-[var(--background)]">
                {item.photo_urls?.[0] ? (
                  <Image
                    src={item.photo_urls[0]}
                    alt={item.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="w-full h-full flex items-center justify-center"
                  >
                    <Utensils size={20} className="text-[var(--text-subtle)]" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--text)] truncate">
                    {item.name}
                  </p>
                  {item.is_sold_out && (
                    <span className="px-1.5 py-0.5 bg-[var(--primary-soft)] text-[var(--primary)] text-[10px] font-semibold rounded-full uppercase">
                      Sold out
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs font-mono text-[var(--primary)] font-bold">
                    ৳{item.price.toFixed(0)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Qty: {item.quantity}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleSoldOut(item)}
                  aria-label={
                    item.is_sold_out ? "Mark available" : "Mark sold out"
                  }
                  aria-pressed={item.is_sold_out}
                  className={clsx(
                    "p-2 rounded-lg transition-colors motion-reduce:transition-none",
                    item.is_sold_out
                      ? "text-[var(--success)] hover:bg-[var(--success)]/10"
                      : "text-[var(--text-muted)] hover:bg-[var(--background)]"
                  )}
                >
                  {item.is_sold_out ? (
                    <Eye size={16} aria-hidden="true" />
                  ) : (
                    <EyeOff size={16} aria-hidden="true" />
                  )}
                </button>
                <Link
                  href={`/seller/edit/${item.id}`}
                  aria-label={`Edit ${item.name}`}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--background)] transition-colors motion-reduce:transition-none"
                >
                  <Pencil size={16} aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item.id)}
                  disabled={deletingId === item.id}
                  aria-label={`Delete ${item.name}`}
                  className="p-2 rounded-lg text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors motion-reduce:transition-none disabled:opacity-50"
                >
                  {deletingId === item.id ? (
                    <span
                      aria-hidden="true"
                      className="block h-4 w-4 border-2 border-[var(--danger)] border-t-transparent rounded-full animate-spin"
                    />
                  ) : (
                    <Trash2 size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Package}
          title="No items yet"
          message="Add your first dish so buyers can pre-order from your store."
          ctaLabel="Create your first item"
          ctaHref="/seller/new-item"
        />
      )}
      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteTarget) deleteItem(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}