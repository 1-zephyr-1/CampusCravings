/**
 * Cart store — single source of truth shared across components and tabs.
 *
 * Design choices:
 *  - A module-level store + custom event bus means we don't need a Provider
 *    in the React tree to call `addItem()`. Components that want to subscribe
 *    use the `useCart` hook (see /components/cart/cart-provider.tsx).
 *  - Persistence is localStorage. We listen to the `storage` event so two
 *    open tabs stay in sync.
 *  - The store is SSR-safe: all reads/writes are guarded by `typeof window`.
 */

import { useEffect, useState } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  store_id: string;
  store_name: string;
  notes: string;
  photo_url: string | null;
}

const STORAGE_KEY = "campus-cravings-cart";

type Listener = (items: CartItem[]) => void;

let items: CartItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(items);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }
}

function readFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: ensure each row has the expected shape.
    return parsed.filter(
      (x): x is CartItem =>
        x &&
        typeof x.id === "string" &&
        typeof x.name === "string" &&
        typeof x.price === "number" &&
        typeof x.quantity === "number" &&
        typeof x.store_id === "string"
    );
  } catch {
    return [];
  }
}

if (typeof window !== "undefined") {
  // Cross-tab sync.
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    items = readFromStorage();
    emit();
  });
}

export const cartStore = {
  /** Lazy initializer so we don't read localStorage on the server. */
  init() {
    if (typeof window === "undefined") return;
    items = readFromStorage();
    emit();
  },
  get() {
    return items;
  },
  add(item: CartItem) {
    // If an item from the same store already exists, bump its qty.
    const existing = items.find((i) => i.id === item.id);
    if (existing) {
      items = items.map((i) =>
        i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
      );
    } else {
      items = [...items, item];
    }
    emit();
  },
  setQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      items = items.filter((i) => i.id !== id);
    } else {
      items = items.map((i) => (i.id === id ? { ...i, quantity } : i));
    }
    emit();
  },
  remove(id: string) {
    items = items.filter((i) => i.id !== id);
    emit();
  },
  clear() {
    items = [];
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/**
 * React hook: subscribe to the cart store, returns the current items.
 * Uses a lazy initializer so we don't show a flash-of-empty-cart on first
 * render — we read localStorage synchronously during `useState`'s init.
 */
export function useCartItems(): [CartItem[], typeof cartStore] {
  const [state, setState] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    return readFromStorage();
  });

  useEffect(() => {
    // Hydrate once in case the initializer returned [] (e.g. during HMR).
    cartStore.init();
    const unsubscribe = cartStore.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  return [state, cartStore];
}

/** Derived total price of the cart. Pure function. */
export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/** Total number of items across all line rows (for the badge). */
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}