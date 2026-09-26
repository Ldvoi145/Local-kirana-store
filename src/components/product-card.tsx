"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { StockStamp } from "@/components/stock-stamp";
import { appendProductToPreset } from "@/app/actions/shop";
import type { Product } from "@/lib/types";

interface ShopPreset {
  id: string;
  name: string;
}

/**
 * Text-only product card. No images by design.
 * Info -> cart quantity stepper (once in cart) -> [Buy] [Add to Preset].
 * "Add to Preset" NEVER creates a preset: it only offers existing
 * presets for this shop, or a link into the Presets creation flow.
 */
export function ProductCard({
  product,
  shopName,
  loggedIn,
  nextPath,
}: {
  product: Product;
  shopName: string;
  loggedIn: boolean;
  nextPath: string;
}) {
  const { lines, add, setQty } = useCart();
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shopPresets, setShopPresets] = useState<ShopPreset[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogMsg, setDialogMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const existing = lines.find((l) => l.product_id === product.id);
  const unavailable = !product.is_available || product.stock_quantity <= 0;
  const atMax = existing ? existing.quantity >= product.stock_quantity : false;
  const cartQty = existing?.quantity ?? 1;

  function buy() {
    if (unavailable && !existing) return;
    if (!existing) {
      const result = add(product, shopName);
      if (result === "switched") setNote(`Cart switched to ${shopName}.`);
    }
    router.push("/cart");
  }

  async function openDialog() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    setDialogOpen(true);
    setDialogMsg(null);
    setShopPresets(null);
    setSelectedId(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("presets")
      .select("id, name")
      .eq("shop_id", product.shop_id)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as ShopPreset[];
    setShopPresets(list);
    if (list.length === 1) setSelectedId(list[0].id);
  }

  function closeDialog() {
    if (busy) return;
    setDialogOpen(false);
    setDialogMsg(null);
  }

  async function addToChosen() {
    if (!selectedId) return;
    const chosen = shopPresets?.find((p) => p.id === selectedId);
    setBusy(true);
    setDialogMsg(null);
    try {
      await appendProductToPreset(
        selectedId,
        product.shop_id,
        product.id,
        cartQty,
      );
      setDialogOpen(false);
      setNote(`Added to preset “${chosen?.name ?? "preset"}”.`);
    } catch (e) {
      setDialogMsg(e instanceof Error ? e.message : "Could not add to preset.");
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

      {existing && (
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
      )}

      <div className="mt-auto flex flex-col min-[420px]:flex-row gap-2 pt-1">
        <button
          onClick={buy}
          disabled={unavailable && !existing}
          className="flex-1 rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep active:bg-leaf-deep disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {unavailable && !existing ? "Unavailable" : "Buy"}
        </button>
        <button
          onClick={openDialog}
          disabled={unavailable && !existing}
          aria-haspopup="dialog"
          className="flex-1 rounded-lg bg-counter border border-leaf text-leaf text-sm font-semibold px-4 py-2 hover:bg-leaf/5 active:bg-leaf/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add to Preset
        </button>
      </div>
      {note && (
        <span role="status" className="text-xs text-ink-soft">
          {note}
        </span>
      )}

      {dialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`preset-dialog-${product.id}`}
          className="fixed inset-0 z-50 grid place-items-center p-4 bg-ink/45"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-counter border border-line p-5 space-y-3 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id={`preset-dialog-${product.id}`}
              className="font-display font-bold text-lg"
            >
              Add to preset
            </h3>
            <p className="text-sm text-ink-soft">
              Choose a preset from {shopName}. The product stays in this
              shop&lsquo;s list — nothing new is created here.
            </p>
            {shopPresets === null ? (
              <p className="text-sm text-ink-soft">Loading presets…</p>
            ) : shopPresets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-ledger p-4 text-center">
                <p className="text-sm font-semibold">No presets yet.</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Create a preset for {shopName} first.
                </p>
                <Link
                  href={`/presets?create=${product.shop_id}`}
                  className="mt-2 inline-block rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep"
                >
                  + Create Preset
                </Link>
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-label="Choose preset"
                className="space-y-1"
              >
                {shopPresets.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${
                      selectedId === p.id
                        ? "border-leaf bg-leaf/5"
                        : "border-line hover:bg-ledger"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`preset-choice-${product.id}`}
                      checked={selectedId === p.id}
                      onChange={() => setSelectedId(p.id)}
                      className="accent-[#176B4D]"
                    />
                    <span className="flex-1 truncate font-medium">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
            {shopPresets !== null && shopPresets.length > 0 && (
              <Link
                href={`/presets?create=${product.shop_id}`}
                className="inline-block text-sm text-leaf font-semibold hover:underline"
              >
                + Create preset
              </Link>
            )}
            {dialogMsg && (
              <p role="alert" className="text-sm text-chili">
                {dialogMsg}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={closeDialog}
                disabled={busy}
                className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-ledger disabled:opacity-50"
              >
                Cancel
              </button>
              {shopPresets !== null && shopPresets.length > 0 && (
                <button
                  onClick={addToChosen}
                  disabled={busy || !selectedId}
                  className="flex-1 rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep disabled:opacity-50"
                >
                  {busy ? "Adding…" : "Add"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
