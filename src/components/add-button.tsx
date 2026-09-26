"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

const STEP_BTN =
  "w-8 h-8 rounded-lg border border-line font-bold hover:bg-ledger disabled:opacity-40 disabled:cursor-not-allowed";

export function AddButton({
  product,
  shopName,
}: {
  product: Product;
  shopName: string;
}) {
  const { lines, add, setQty } = useCart();
  const [note, setNote] = useState<string | null>(null);
  const unavailable = !product.is_available || product.stock_quantity <= 0;
  const existing = lines.find((l) => l.product_id === product.id);

  if (existing) {
    const atMax = existing.quantity >= product.stock_quantity;
    return (
      <span
        className="inline-flex items-center gap-1"
        role="group"
        aria-label={`Quantity of ${product.name} in cart`}
      >
        <button
          aria-label={`Remove one ${product.name} from cart`}
          onClick={() => setQty(product.id, existing.quantity - 1)}
          className={STEP_BTN}
        >
          −
        </button>
        <span aria-live="polite" className="w-8 text-center text-sm font-bold">
          {existing.quantity}
        </span>
        <button
          aria-label={`Add one more ${product.name} to cart`}
          onClick={() => setQty(product.id, existing.quantity + 1)}
          disabled={atMax}
          title={atMax ? `Only ${product.stock_quantity} in stock` : undefined}
          className={STEP_BTN}
        >
          +
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        disabled={unavailable}
        onClick={() => {
          const result = add(product, shopName);
          setNote(
            result === "switched"
              ? `Cart switched to ${shopName}.`
              : `Added ${product.name}.`,
          );
        }}
        className="rounded-lg bg-leaf text-white text-sm font-semibold px-3 py-1.5 hover:bg-leaf-deep disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {unavailable ? "Unavailable" : "Add"}
      </button>
      {note && (
        <span role="status" className="text-xs text-ink-soft">
          {note}
        </span>
      )}
    </span>
  );
}
