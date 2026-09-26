"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { StockStamp } from "@/components/stock-stamp";
import {
  appendProductToPreset,
  createPresetWithItem,
} from "@/app/actions/shop";
import type { Product } from "@/lib/types";

/**
 * Text-only product card. No images by design.
 * Info -> quantity stepper (once in cart) -> Buy / Add to Preset.
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [presets, setPresets] = useState<{ id: string; name: string }[] | null>(null);
  const [presetMsg, setPresetMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const existing = lines.find((l) => l.product_id === product.id);
  const unavailable = !product.is_available || product.stock_quantity <= 0;
  const atMax = existing ? existing.quantity >= product.stock_quantity : false;
  const presetQty = existing?.quantity ?? 1;

  function buy() {
    if (unavailable) return;
    if (existing) {
      router.push("/cart");
      return;
    }
    const result = add(product, shopName);
    if (result === "switched") setNote(`Cart switched to ${shopName}.`);
    else setNote(null);
  }

  async function togglePicker() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    const opening = !pickerOpen;
    setPickerOpen(opening);
    setPresetMsg(null);
    if (opening && presets === null) {
      const supabase = createClient();
      const { data } = await supabase
        .from("presets")
        .select("id, name")
        .eq("shop_id", product.shop_id)
        .order("created_at", { ascending: false });
      setPresets((data ?? []) as { id: string; name: string }[]);
    }
  }

  async function refreshPresets() {
    const supabase = createClient();
    const { data } = await supabase
      .from("presets")
      .select("id, name")
      .eq("shop_id", product.shop_id)
      .order("created_at", { ascending: false });
    setPresets((data ?? []) as { id: string; name: string }[]);
  }

  async function addToPreset(presetId: string, presetName: string) {
    setBusy(true);
    setPresetMsg(null);
    try {
      await appendProductToPreset(presetId, product.shop_id, product.id, presetQty);
      setPresetMsg(`Added to “${presetName}”.`);
    } catch (e) {
      setPresetMsg(e instanceof Error ? e.message : "Could not add to preset.");
    } finally {
      setBusy(false);
    }
  }

  async function createNew() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setPresetMsg(null);
    try {
      await createPresetWithItem(product.shop_id, name, product.id, presetQty);
      setPresetMsg(`Saved to new preset “${name}”.`);
      setNewName("");
      await refreshPresets();
    } catch (e) {
      setPresetMsg(e instanceof Error ? e.message : "Could not save preset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl bg-counter border border-line p-4 flex flex-col gap-2 lift">
      <p className="font-semibold text-[15px] leading-snug">{product.name}</p>
      <p className="text-sm tnum">
        <span className="font-bold text-ink">₹{Number(product.price).toFixed(2)}</span>
        <span className="text-ink-soft"> · {product.unit}</span>
      </p>
      <div>
        <StockStamp stock={product.stock_quantity} available={product.is_available} />
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
          <span aria-live="polite" className="w-8 text-center text-sm font-bold tnum">
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
          onClick={togglePicker}
          disabled={unavailable && !existing}
          aria-expanded={pickerOpen}
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

      {pickerOpen && (
        <div className="rounded-xl border border-line bg-ledger p-3 space-y-2">
          <p className="text-xs font-semibold text-ink-soft">
            Save {presetQty} × {product.name} to…
          </p>
          {presets === null ? (
            <p className="text-xs text-ink-soft">Loading presets…</p>
          ) : presets.length === 0 ? (
            <p className="text-xs text-ink-soft">No presets for this shop yet.</p>
          ) : (
            <ul className="space-y-1">
              {presets.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                  <button
                    onClick={() => addToPreset(p.id, p.name)}
                    disabled={busy}
                    className="rounded-lg border border-line bg-counter px-2.5 py-1 text-xs font-bold hover:bg-white disabled:opacity-50"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New preset name"
              aria-label="New preset name"
              maxLength={60}
              className="flex-1 min-w-0 rounded-lg border border-line px-2.5 py-1.5 text-sm"
            />
            <button
              onClick={createNew}
              disabled={busy || !newName.trim()}
              className="rounded-lg bg-leaf text-white text-xs font-bold px-3 py-1.5 hover:bg-leaf-deep disabled:opacity-50"
            >
              {busy ? "Saving…" : "Create"}
            </button>
          </div>
          {presetMsg && (
            <p role="status" className="text-xs text-ink">
              {presetMsg}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
