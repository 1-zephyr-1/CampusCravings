"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  cartStore,
  cartTotal,
  cartCount,
  useCartItems,
  type CartItem,
} from "@/lib/cart-store";
import { toast } from "@/components/ui/toast";

interface CartContextValue {
  items: CartItem[];
  total: number;
  count: number;
  add: (item: CartItem) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items] = useCartItems();

  const add = (item: CartItem) => {
    cartStore.add(item);
    toast(`${item.name} added to cart`, "success");
  };

  const value: CartContextValue = {
    items,
    total: cartTotal(items),
    count: cartCount(items),
    add,
    setQuantity: cartStore.setQuantity,
    remove: cartStore.remove,
    clear: cartStore.clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
}