"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { StockStamp } from "@/components/stock-stamp";
import type { Product } from "@/lib/types";

/**
 * Text-only product card. No images by design.
 * Info -> [Add to Cart] -> [−] n [+] stepper. Buying happens only in
 * the separate selection/cart card, never on this card.
 */
export function ProductCard({
  product,
  shopName,
}: {
  product: Product;
  shopName: string;
}) {
  const { lines, add, setQty } = useCart();
  const [note, setNote] = useState<string | null>(null);

  const existing = lines.find((l) => l.product_id === product.id);
  const unavailable = !product.is_available || product.stock_quantity <= 0;
  const atMax = existing ? existing.quantity >= product.stock_quantity : false;

  function addOne() {
    if (unavailable) return;
    const result = add(product, shopName);
    if (result === "switched") setNote(`Cart switched to ${shopName}.`);
    else setNote(null);
  }

  return (
    <li className="rounded-2xl bg-counter border border-line p-4 flex flex-col gap-2 lift">
      <p className="font-semibold text-[15px] leading-snug">{product.name}</p>
      <p className="text-sm tnum">
        <span className="font-bold text-ink">
          ₹{Number(product.price).toFixed(2)}
        </span>
        <span className="text-ink-soft"> · {product.unit}</span>
      </p>
      <div>
        <StockStamp
          stock={product.stock_quantity}
          available={product.is_available}
        />
      </div>

      <div className="mt-auto pt-1">
        {existing ? (
          <span
            className="inline-flex items-center gap-1"
            role="group"
            aria-label={`Quantity of ${product.name} in cart`}
          >
            <button
              aria-label={`Remove one ${product.name} from cart`}
              onClick={() => setQty(product.id, existing.quantity - 1)}
              className="w-9 h-9 rounded-lg border border-line font-bold hover:bg-ledger"
            >
              −
            </button>
            <span
              aria-live="polite"
              className="w-8 text-center text-sm font-bold tnum"
            >
              {existing.quantity}
            </span>
            <button
              aria-label={`Add one more ${product.name} to cart`}
              onClick={() => setQty(product.id, existing.quantity + 1)}
              disabled={atMax}
              title={atMax ? `Only ${product.stock_quantity} in stock` : undefined}
              className="w-9 h-9 rounded-lg border border-line font-bold hover:bg-ledger disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
          </span>
        ) : (
          <button
            onClick={addOne}
            disabled={unavailable}
            className="w-fit rounded-lg bg-leaf text-white text-sm font-bold px-4 py-1.5 hover:bg-leaf-deep active:bg-leaf-deep disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {unavailable ? "Unavailable" : "Add to Cart"}
          </button>
        )}
      </div>
      {note && (
        <span role="status" className="text-xs text-ink-soft">
          {note}
        </span>
      )}
    </li>
  );
}
