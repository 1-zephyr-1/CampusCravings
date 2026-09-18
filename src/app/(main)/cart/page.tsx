"use client";

import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import { PickupTimePicker } from "@/components/cart/pickup-time-picker";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  ShoppingBag,
  Bookmark,
  Plus,
  Tag,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/components/ui/toast";
import type { FoodItem } from "@/types";
import { ErrorBoundary } from "@/components/dev/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

type SuggestedItem = Pick<
  FoodItem,
  "id" | "name" | "price" | "photo_urls" | "store_id" | "is_sold_out" | "description"
>;

interface SavedForLaterItem {
  id: string;
  name: string;
  price: number;
  photo_url: string | null;
  store_id: string;
  store_name: string;
}

const SAVED_FOR_LATER_KEY = "campus-cravings-saved-for-later";
const MAX_SAVED_ITEMS = 20;

function readSavedForLater(): SavedForLaterItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_FOR_LATER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SavedForLaterItem =>
        x &&
        typeof x.id === "string" &&
        typeof x.name === "string" &&
        typeof x.price === "number" &&
        typeof x.store_id === "string" &&
        typeof x.store_name === "string"
    );
  } catch {
    return [];
  }
}

function writeSavedForLater(items: SavedForLaterItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_FOR_LATER_KEY, JSON.stringify(items));
  } catch {
    /* non-fatal */
  }
}

export default function CartPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const {
    items: cartItems,
    setQuantity,
    remove,
    clear,
    add,
  } = useCart();
  const [placing, setPlacing] = useState(false);
  // Pickup time is per-store (since orders are placed per-store).
  const [pickupTimes, setPickupTimes] = useState<Record<string, string>>({});
  // Pickup area per store (so the buyer knows where to collect the order).
  const [storeAreas, setStoreAreas] = useState<Record<string, string>>({});
  // True while we're still loading pickup areas for any store in the cart.
  const [pickupAreasLoading, setPickupAreasLoading] = useState(false);
  // Confirmation modal for clearing the cart.
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  // Saved-for-later list (persisted in localStorage).
  const [savedItems, setSavedItems] = useState<SavedForLaterItem[]>([]);
  // Promo code input.
  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState<{
    type: "info" | "error";
    text: string;
  } | null>(null);
  // Per-store suggested items (popular items from the same store, not in cart).
  const [suggestionsByStore, setSuggestionsByStore] = useState<
    Record<string, SuggestedItem[]>
  >({});
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Hydrate saved-for-later list once on mount.
  useEffect(() => {
    setSavedItems(readSavedForLater());
  }, []);

  // Fetch pickup area for each distinct store in the cart.
  useEffect(() => {
    const storeIds = Array.from(new Set(cartItems.map((i) => i.store_id)));
    const missing = storeIds.filter((id) => !storeAreas[id]);
    if (missing.length === 0) {
      setPickupAreasLoading(false);
      return;
    }
    let cancelled = false;
    setPickupAreasLoading(true);
    supabase
      .from("stores")
      .select("id, pickup_area")
      .in("id", missing)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setStoreAreas((prev) => {
          const next = { ...prev };
          for (const row of data) {
            if (row && row.id) next[row.id] = row.pickup_area || "";
          }
          return next;
        });
        setPickupAreasLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cartItems, supabase, storeAreas]);

  // Fetch suggested add-ons per store: most recently created items from the
  // same store that aren't already in the cart and aren't sold out. We rely
  // on `created_at` ordering as a proxy for "popular" since the schema
  // doesn't include a popularity column.
  useEffect(() => {
    const storeIds = Array.from(new Set(cartItems.map((i) => i.store_id)));
    const cartItemIds = new Set(cartItems.map((i) => i.id));
    if (storeIds.length === 0) {
      setSuggestionsByStore({});
      return;
    }
    const storesNeedingSuggestions = storeIds.filter(
      (id) => !(id in suggestionsByStore),
    );
    if (storesNeedingSuggestions.length === 0) return;

    let cancelled = false;
    setSuggestionsLoading(true);
    (async () => {
      // Fetch a few items per store so we can filter out what's in the cart
      // and cap at 3 suggestions.
      const { data, error } = await supabase
        .from("food_items")
        .select(
          "id, name, price, photo_urls, store_id, is_sold_out, description",
        )
        .in("store_id", storesNeedingSuggestions)
        .eq("is_sold_out", false)
        .order("created_at", { ascending: false })
        .limit(30);
      if (cancelled) return;
      if (error || !data) {
        setSuggestionsLoading(false);
        return;
      }
      const byStore: Record<string, SuggestedItem[]> = {};
      for (const row of data as SuggestedItem[]) {
        if (cartItemIds.has(row.id)) continue;
        if (!byStore[row.store_id]) byStore[row.store_id] = [];
        if (byStore[row.store_id].length < 3) {
          byStore[row.store_id].push(row);
        }
      }
      setSuggestionsByStore((prev) => ({ ...prev, ...byStore }));
      setSuggestionsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // We intentionally only re-suggest when the set of store IDs changes so
    // we don't refetch on every quantity tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.map((i) => i.store_id).join("|")]);

  // Group by store.
  const groupedByStore = useMemo(
    () =>
      cartItems.reduce((acc, item) => {
        if (!acc[item.store_id]) {
          acc[item.store_id] = {
            store_name: item.store_name,
            pickup_area: storeAreas[item.store_id] || "",
            items: [],
          };
        }
        acc[item.store_id].items.push(item);
        return acc;
      }, {} as Record<
        string,
        {
          store_name: string;
          pickup_area: string;
          items: typeof cartItems;
        }
      >),
    [cartItems, storeAreas],
  );

  function saveForLater(item: (typeof cartItems)[number]) {
    // Move the item to the saved-for-later list, then drop it from the cart.
    setSavedItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      const next = [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          photo_url: item.photo_url,
          store_id: item.store_id,
          store_name: item.store_name,
        },
      ].slice(-MAX_SAVED_ITEMS);
      writeSavedForLater(next);
      return next;
    });
    remove(item.id);
    toast(`${item.name} saved for later`, "info");
  }

  function moveBackToCart(item: SavedForLaterItem) {
    setSavedItems((prev) => {
      const next = prev.filter((p) => p.id !== item.id);
      writeSavedForLater(next);
      return next;
    });
    add({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      store_id: item.store_id,
      store_name: item.store_name,
      notes: "",
      photo_url: item.photo_url,
    });
  }

  function removeSaved(id: string) {
    setSavedItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writeSavedForLater(next);
      return next;
    });
  }

  function handleClearCart() {
    clear();
    setConfirmClearOpen(false);
    toast("Cart cleared", "info");
  }

  function handleApplyPromo() {
    const code = promoInput.trim();
    if (!code) {
      setPromoMessage({ type: "error", text: "Enter a promo code first." });
      return;
    }
    // The promo_codes table doesn't exist in this project (verified via
    // `grep -i "promo" supabase/migrations/*.sql` — only notifications use
    // a "promotion" enum value). Surface a friendly placeholder message so
    // users know it's a work-in-progress.
    setPromoMessage({
      type: "info",
      text: "Promo codes coming soon — stay tuned!",
    });
  }

  async function handlePlaceOrders() {
    if (!user || cartItems.length === 0) return;
    setPlacing(true);

    // Check pending orders
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .in("status", ["requested", "accepted"]);

    if (count && count >= 3) {
      toast("You have too many pending orders.", "error");
      setPlacing(false);
      return;
    }

    // Place one order per store
    for (const [storeId, group] of Object.entries(groupedByStore)) {
      const totalPrice = group.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const pickupIso = pickupTimes[storeId];
      const pickupTimeDisplay = pickupIso
        ? new Date(pickupIso).toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })
        : "Flexible";

      const { data: order } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          store_id: storeId,
          total_price: totalPrice,
          pickup_time: pickupTimeDisplay,
          notes:
            group.items
              .map((i) => i.notes)
              .filter(Boolean)
              .join("; ") || null,
        })
        .select()
        .single();

      if (order) {
        for (const item of group.items) {
          await supabase.from("order_items").insert({
            order_id: order.id,
            item_id: item.id,
            quantity: item.quantity,
            price_at_time: item.price,
          });
        }

        // Notify seller
        const { data: store } = await supabase
          .from("stores")
          .select("user_id")
          .eq("id", storeId)
          .single();

        if (store) {
          await supabase.from("notifications").insert({
            user_id: store.user_id,
            title: "New Order!",
            message: `You have a new pre-order for ৳${totalPrice.toFixed(
              0,
            )} (pickup ${pickupTimeDisplay})`,
            link: "/seller/orders",
          });
        }
      }
    }

    clear();
    setPlacing(false);
    router.push("/orders?just_placed=1");
  }

  function addSuggestedToCart(item: SuggestedItem) {
    const storeName =
      groupedByStore[item.store_id]?.store_name ?? "this store";
    add({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: 1,
      store_id: item.store_id,
      store_name: storeName,
      notes: "",
      photo_url: item.photo_urls?.[0] ?? null,
    });
    // Remove the just-added item from suggestions so the row disappears.
    setSuggestionsByStore((prev) => ({
      ...prev,
      [item.store_id]: (prev[item.store_id] ?? []).filter(
        (s) => s.id !== item.id,
      ),
    }));
  }

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const allStoresHavePickup = Object.keys(groupedByStore).every(
    (id) => pickupTimes[id],
  );

  const placeOrderLabel = placing
    ? "Placing orders…"
    : `Place order${cartItems.length > 1 ? "s" : ""} · ৳${total.toFixed(0)}`;

  // Render the place-order CTA. We share this between the inline cart
  // summary and the mobile sticky bar.
  const placeOrderButton = (
    <button
      type="button"
      onClick={handlePlaceOrders}
      disabled={placing || !allStoresHavePickup}
      className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all motion-reduce:transition-none disabled:opacity-50"
    >
      {placeOrderLabel}
    </button>
  );

  const isCartEmpty = cartItems.length === 0;

  return (
    <ErrorBoundary>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 pb-32 md:pb-4">
        <h1 className="text-xl font-bold text-[var(--text)] mb-4">Your cart</h1>

      {isCartEmpty && savedItems.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Browse the feed and add some homemade meals to get started."
          ctaLabel="Browse food"
          ctaHref="/feed"
        />
      ) : (
        <>
          {isCartEmpty && savedItems.length > 0 ? (
            <div className="mb-4 bg-[var(--primary-soft)] border border-[var(--primary)]/20 rounded-lg px-3 py-2 text-xs text-[var(--text-muted)]">
              Your cart is empty, but you have {savedItems.length}{" "}
              {savedItems.length === 1 ? "item" : "items"} saved for later.
            </div>
          ) : null}

          {!isCartEmpty && (
            <p
              role="status"
              className="mb-3 text-xs text-[var(--text-muted)] bg-[var(--primary-soft)] border border-[var(--primary)]/20 rounded-lg px-3 py-2"
            >
              Heads up: items are held until you place the order. If a seller
              marks something sold out while you&apos;re here, we&apos;ll drop
              it automatically.
            </p>
          )}

          {!isCartEmpty &&
            Object.entries(groupedByStore).map(([storeId, group]) => {
              const suggestions = suggestionsByStore[storeId] ?? [];
              return (
                <div
                  key={storeId}
                  className="mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden"
                >
                  <div className="px-4 pt-3 pb-2 border-b border-[var(--border)] bg-[var(--background)]">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-[var(--text)]">
                        {group.store_name}
                      </h2>
                      <span className="text-[11px] text-[var(--text-subtle)]">
                        Pick up at:{" "}
                        {pickupAreasLoading && !group.pickup_area ? (
                          <Skeleton
                            className="inline-block h-3 w-24 align-middle"
                            shape="pill"
                          />
                        ) : (
                          <span className="font-medium text-[var(--text-muted)]">
                            {group.pickup_area || "seller's preferred spot"}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <ul role="list" className="divide-y divide-[var(--border)]">
                    {group.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 p-3"
                      >
                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)] flex items-center justify-center shrink-0 overflow-hidden">
                          {item.photo_url ? (
                            <Image
                              src={item.photo_url}
                              alt={item.name}
                              width={56}
                              height={56}
                              sizes="56px"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag
                              size={20}
                              className="text-[var(--text-subtle)]"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text)] truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">
                            ৳{item.price.toFixed(0)} each
                          </p>
                        </div>
                        <QuantityStepper
                          value={item.quantity}
                          onChange={(q) => setQuantity(item.id, q)}
                          min={1}
                          max={20}
                          label={`${item.name} quantity`}
                          size="sm"
                        />
                        <span className="text-sm font-bold font-mono text-[var(--primary)] w-14 text-right">
                          ৳{(item.price * item.quantity).toFixed(0)}
                        </span>
                        <div className="flex flex-col items-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => saveForLater(item)}
                            aria-label={`Save ${item.name} for later`}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors motion-reduce:transition-none"
                          >
                            <Bookmark size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(item.id)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors motion-reduce:transition-none"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Per-store pickup time */}
                  <div className="px-4 py-3 bg-[var(--background)] border-t border-[var(--border)]">
                    <PickupTimePicker
                      value={pickupTimes[storeId] || ""}
                      onChange={(iso) =>
                        setPickupTimes((prev) => ({
                          ...prev,
                          [storeId]: iso,
                        }))
                      }
                      id={`pickup-${storeId}`}
                      defaultMinutes={30}
                      snapMinutes={15}
                    />
                  </div>

                  {/* Suggested add-ons from the same store. */}
                  <div className="px-4 py-3 bg-[var(--background)] border-t border-[var(--border)]">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-[var(--text-subtle)] mb-2">
                      Popular at {group.store_name}
                    </p>
                    {suggestionsLoading &&
                    suggestions.length === 0 ? (
                      <div
                        className="flex gap-2 overflow-hidden"
                        role="status"
                        aria-label="Loading suggestions"
                      >
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-[var(--surface-elev)] rounded-lg overflow-hidden"
                          >
                            {/* matches the square image area on suggestion cards */}
                            <Skeleton className="w-full aspect-square" />
                            <div className="p-2 space-y-1">
                              <Skeleton className="h-3 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : suggestions.length === 0 ? (
                      <p className="text-xs text-[var(--text-subtle)]">
                        No suggestions right now — check back later.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {suggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => addSuggestedToCart(s)}
                            className="text-left bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 hover:border-[var(--primary)]/50 transition-colors motion-reduce:transition-none"
                          >
                            <div className="w-full aspect-square rounded-md bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)] flex items-center justify-center overflow-hidden mb-1">
                              {s.photo_urls?.[0] ? (
                                <Image
                                  src={s.photo_urls[0]}
                                  alt={s.name}
                                  width={80}
                                  height={80}
                                  sizes="(max-width: 640px) 30vw, 80px"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ShoppingBag
                                  size={18}
                                  className="text-[var(--text-subtle)]"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <p className="text-xs font-medium text-[var(--text)] truncate">
                              {s.name}
                            </p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[11px] font-mono text-[var(--primary)]">
                                ৳{Number(s.price).toFixed(0)}
                              </span>
                              <Plus
                                size={12}
                                className="text-[var(--text-muted)]"
                                aria-hidden="true"
                              />
                            </div>
                            <span className="sr-only">
                              Add {s.name} to cart
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Saved-for-later list. */}
          {savedItems.length > 0 && (
            <section
              aria-labelledby="saved-for-later-heading"
              className="mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden"
            >
              <div className="px-4 pt-3 pb-2 border-b border-[var(--border)] bg-[var(--background)]">
                <h2
                  id="saved-for-later-heading"
                  className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5"
                >
                  <Bookmark size={14} aria-hidden="true" />
                  Saved for later
                </h2>
                <p className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                  {savedItems.length}{" "}
                  {savedItems.length === 1 ? "item" : "items"} tucked away
                </p>
              </div>
              <ul role="list" className="divide-y divide-[var(--border)]">
                {savedItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--primary-soft)] to-[var(--warning-soft)] flex items-center justify-center shrink-0 overflow-hidden">
                      {item.photo_url ? (
                        <Image
                          src={item.photo_url}
                          alt={item.name}
                          width={48}
                          height={48}
                          sizes="48px"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag
                          size={16}
                          className="text-[var(--text-subtle)]"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-subtle)] truncate">
                        {item.store_name} · ৳
                        {item.price.toFixed(0)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => moveBackToCart(item)}
                      aria-label={`Move ${item.name} back to cart`}
                      className="px-2.5 py-1.5 bg-[var(--primary-soft)] text-[var(--primary)] rounded-lg text-xs font-medium hover:bg-[var(--primary)]/15 transition-colors motion-reduce:transition-none flex items-center gap-1"
                    >
                      <ArrowLeft size={12} aria-hidden="true" />
                      Move to cart
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSaved(item.id)}
                      aria-label={`Remove ${item.name} from saved for later`}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors motion-reduce:transition-none"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Total + CTA + promo. Shown on desktop only — mobile gets a sticky bar below. */}
          {!isCartEmpty && (
            <div className="hidden md:block bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--text-muted)]">Total</span>
                <span className="text-xl font-bold font-mono text-[var(--primary)]">
                  ৳{total.toFixed(0)}
                </span>
              </div>
              {!allStoresHavePickup && (
                <p
                  role="status"
                  className="text-xs text-[var(--text-muted)] mb-2"
                >
                  Choose a pickup time for each store before placing your
                  order.
                </p>
              )}
              {placeOrderButton}
              <p className="mt-2 text-[11px] text-center text-[var(--text-subtle)]">
                You&apos;ll pay in cash when you pick up. No commissions, no
                upfront fees.
              </p>

              {/* Promo code input. */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <label
                  htmlFor="promo-code"
                  className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1 mb-1.5"
                >
                  <Tag size={12} aria-hidden="true" />
                  Have a promo code?
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo-code"
                    type="text"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value);
                      if (promoMessage) setPromoMessage(null);
                    }}
                    placeholder="Enter code"
                    autoComplete="off"
                    className="flex-1 min-w-0 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3 py-2 bg-[var(--primary-soft)] text-[var(--primary)] rounded-lg text-sm font-medium hover:bg-[var(--primary)]/15 transition-colors motion-reduce:transition-none"
                  >
                    Apply
                  </button>
                </div>
                {promoMessage && (
                  <p
                    role="status"
                    className={`mt-1.5 text-xs ${
                      promoMessage.type === "error"
                        ? "text-[var(--danger)]"
                        : "text-[var(--text-subtle)]"
                    }`}
                  >
                    {promoMessage.text}
                  </p>
                )}
              </div>

              {/* Clear cart. */}
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors motion-reduce:transition-none flex items-center gap-1"
                >
                  <Trash2 size={12} aria-hidden="true" />
                  Clear cart
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isCartEmpty && savedItems.length === 0 && (
        <p className="mt-6 text-center text-xs">
          <Link
            href="/feed"
            className="text-[var(--primary)] hover:underline"
          >
            Keep browsing →
          </Link>
        </p>
      )}

      {/* Mobile sticky checkout bar. Sits above the bottom nav (z-50 in the
          nav, so we render slightly behind it by using z-40 and giving the
          bar a safe-area inset). Hidden on md+ where the inline checkout
          summary is used instead. */}
      {!isCartEmpty && (
        <div
          className="fixed bottom-16 left-0 right-0 z-40 md:hidden bg-[var(--surface)] border-t border-[var(--border)] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0)+0.5rem)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
          role="region"
          aria-label="Checkout summary"
        >
          <div className="flex items-center justify-between mb-2 text-xs text-[var(--text-muted)]">
            <span>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            <span className="font-bold font-mono text-[var(--primary)] text-sm">
              ৳{total.toFixed(0)}
            </span>
          </div>
          {placeOrderButton}
          {!allStoresHavePickup && (
            <p
              role="status"
              className="mt-1.5 text-[11px] text-center text-[var(--text-subtle)]"
            >
              Pick a pickup time for each store above first.
            </p>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmClearOpen}
        title="Clear your cart?"
        message="This removes every item currently in your cart. Items you've saved for later will be kept."
        confirmLabel="Clear cart"
        danger
        onConfirm={handleClearCart}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
    </ErrorBoundary>
  );
}
