"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { CartLine, Product } from "@/lib/types";

const STORAGE_KEY = "kirana-cart-v1";

function readStored(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

// Tiny external store: useSyncExternalStore keeps server and client renders
// consistent without mount-time setState.
let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function getCart(): CartLine[] {
  if (cache) return cache;
  cache = typeof window === "undefined" ? [] : readStored();
  return cache;
}

function getServerCart(): CartLine[] {
  return SERVER_CART;
}

const SERVER_CART: CartLine[] = [];

function setCart(next: CartLine[] | ((prev: CartLine[]) => CartLine[])) {
  cache = typeof next === "function" ? next(getCart()) : next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Private mode or unavailable storage; cart still works in memory.
  }
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

interface CartContextValue {
  lines: CartLine[];
  shopName: string | null;
  count: number;
  total: number;
  add: (product: Product, shopName: string) => "added" | "switched";
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  replace: (lines: CartLine[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getCart, getServerCart);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0);
    const total = lines.reduce((n, l) => n + l.price * l.quantity, 0);
    return {
      lines,
      shopName: lines.length > 0 ? lines[0].shop_name : null,
      count,
      total,
      add(product, shopName) {
        let result: "added" | "switched" = "added";
        setCart((prev) => {
          if (prev.length > 0 && prev[0].shop_id !== product.shop_id) {
            result = "switched";
            return [
              {
                product_id: product.id,
                name: product.name,
                price: Number(product.price),
                unit: product.unit,
                shop_id: product.shop_id,
                shop_name: shopName,
                quantity: 1,
              },
            ];
          }
          const cur = prev.find((l) => l.product_id === product.id);
          if (cur) {
            if (cur.quantity >= product.stock_quantity) return prev;
            return prev.map((l) =>
              l.product_id === product.id
                ? { ...l, quantity: l.quantity + 1 }
                : l,
            );
          }
          return [
            ...prev,
            {
              product_id: product.id,
              name: product.name,
              price: Number(product.price),
              unit: product.unit,
              shop_id: product.shop_id,
              shop_name: shopName,
              quantity: 1,
            },
          ];
        });
        return result;
      },
      setQty(productId, qty) {
        setCart((prev) =>
          qty <= 0
            ? prev.filter((l) => l.product_id !== productId)
            : prev.map((l) =>
                l.product_id === productId ? { ...l, quantity: qty } : l,
              ),
        );
      },
      remove(productId) {
        setCart((prev) => prev.filter((l) => l.product_id !== productId));
      },
      clear() {
        setCart([]);
      },
      replace(next) {
        setCart(next);
      },
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider.");
  return ctx;
}
