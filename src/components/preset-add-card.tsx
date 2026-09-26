"use client";

import { useState } from "react";
import { StockStamp } from "@/components/stock-stamp";
import { setPresetItemQty } from "@/app/actions/shop";
import type { Product } from "@/lib/types";

/**
 * Text-only card used INSIDE a preset-building context
 * (/shop/[id]?preset=[presetId]). No cart, no Buy, no new presets:
 * [+ Add] adds to the open preset, then a [−] n [+] stepper edits it.
 */
export function PresetAddCard({
  product,
  presetId,
  initialQty,
}: {
  product: Product;
  presetId: string;
  initialQty: number;
}) {
  const [qty, setQtyState] = useState(initialQty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unavailable = !product.is_available || product.stock_quantity <= 0;
  const atMax = qty >= product.stock_quantity;

  async function write(next: number) {
    setBusy(true);
    setError(null);
    try {
      await setPresetItemQty(presetId, product.id, next);
      setQtyState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update preset.");
    } finally {
      setBusy(false);
    }
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
        {qty > 0 ? (
          <span
            className="inline-flex items-center gap-1"
            role="group"
            aria-label={`Quantity of ${product.name} in this preset`}
          >
            <button
              aria-label={`Remove one ${product.name} from preset`}
              onClick={() => write(qty - 1)}
              disabled={busy}
              className="w-9 h-9 rounded-lg border border-line font-bold hover:bg-ledger disabled:opacity-40"
            >
              −
            </button>
            <span
              aria-live="polite"
              className="w-8 text-center text-sm font-bold tnum"
            >
              {qty}
            </span>
            <button
              aria-label={`Add one more ${product.name} to preset`}
              onClick={() => write(qty + 1)}
              disabled={busy || atMax}
              title={atMax ? `Only ${product.stock_quantity} in stock` : undefined}
              className="w-9 h-9 rounded-lg border border-line font-bold hover:bg-ledger disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
          </span>
        ) : (
          <button
            onClick={() => write(1)}
            disabled={busy || unavailable}
            className="w-fit rounded-lg bg-leaf text-white text-sm font-bold px-4 py-1.5 hover:bg-leaf-deep active:bg-leaf-deep disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {unavailable ? "Unavailable" : "+ Add"}
          </button>
        )}
      </div>
      {error && (
        <span role="alert" className="text-xs text-chili">
          {error}
        </span>
      )}
    </li>
  );
}
