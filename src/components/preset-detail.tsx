"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePresetOrder } from "@/components/use-preset-order";
import {
  deletePreset,
  removePresetItem,
  renamePreset,
  setPresetItemQty,
} from "@/app/actions/shop";
import type { Preset } from "@/lib/types";

export function PresetDetail({ preset }: { preset: Preset }) {
  const router = useRouter();
  const { orderPreset, busyId, outcome } = usePresetOrder();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(preset.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = (preset.items ?? []).filter((i) => i.product);
  const total = lines.reduce(
    (n, i) => n + Number(i.product!.price) * i.quantity,
    0,
  );

  async function saveName() {
    if (!name.trim() || name.trim() === preset.name) {
      setRenaming(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await renamePreset(preset.id, name);
      setRenaming(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename.");
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    setBusy(true);
    try {
      await deletePreset(preset.id);
      router.push("/presets");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/presets"
        className="inline-block text-sm text-leaf font-semibold hover:underline"
      >
        ← Back to Presets
      </Link>

      <section className="rounded-2xl bg-counter border border-line p-5">
        {renaming ? (
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Preset name"
              maxLength={60}
              autoFocus
              className="flex-1 min-w-0 rounded-lg border border-line px-3 py-2 text-sm font-semibold"
            />
            <button
              onClick={saveName}
              disabled={busy || !name.trim()}
              className="rounded-lg bg-leaf text-white text-sm font-bold px-4 hover:bg-leaf-deep disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setRenaming(false);
                setName(preset.name);
              }}
              className="rounded-lg border border-line text-sm font-semibold px-4 hover:bg-ledger"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-2xl tracking-tight">
                {preset.name}
              </h1>
              <p className="text-sm text-ink-soft tnum">
                {preset.shop_name} · {lines.length} item
                {lines.length === 1 ? "" : "s"}
                {lines.length > 0 && (
                  <>
                    {" "}· Estimated{" "}
                    <span className="font-bold text-ink">
                      ₹{total.toFixed(2)}
                    </span>
                  </>
                )}
              </p>
            </div>
            <button
              onClick={() => setRenaming(true)}
              aria-label={`Rename ${preset.name}`}
              className="rounded-lg border border-line text-sm font-semibold px-3 py-1.5 hover:bg-ledger"
            >
              Rename
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-chili">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/shop/${preset.shop_id}?preset=${preset.id}`}
            className="rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep"
          >
            + Add Items
          </Link>
          <button
            onClick={() => orderPreset(preset.id, preset.name)}
            disabled={busyId === preset.id || lines.length === 0}
            className="rounded-lg border border-leaf text-leaf text-sm font-bold px-4 py-2 hover:bg-leaf/5 disabled:opacity-50"
          >
            {busyId === preset.id ? "Ordering…" : "Order"}
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={destroy}
                disabled={busy}
                className="rounded-lg bg-chili text-white text-sm font-bold px-4 py-2 hover:brightness-95 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-line text-sm font-semibold px-4 py-2 hover:bg-ledger"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg text-sm text-chili hover:underline px-2"
            >
              Delete
            </button>
          )}
        </div>
      </section>

      {outcome && (
        <div
          role="status"
          className="rounded-2xl bg-counter border border-leaf/40 p-4 text-sm space-y-1"
        >
          {outcome.kind === "ordered" ? (
            <>
              <p className="font-semibold">
                {outcome.presetName} added to cart
              </p>
              <p className="text-ink-soft tnum">
                {outcome.addedCount} item{outcome.addedCount === 1 ? "" : "s"}{" "}
                added · Total ₹{outcome.total.toFixed(2)}
              </p>
              {outcome.adjusted.map((a) => (
                <p key={a.name} className="text-ink-soft">
                  Only {a.added} × {a.name} in stock (wanted {a.wanted}).
                </p>
              ))}
              {outcome.unavailable.length > 0 && (
                <>
                  <p className="font-semibold">Unavailable:</p>
                  <ul className="list-disc ml-5">
                    {outcome.unavailable.map((n) => (
                      <li key={n}>• {n}</li>
                    ))}
                  </ul>
                </>
              )}
              <Link
                href="/cart"
                className="inline-block mt-1 rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep"
              >
                View Cart
              </Link>
            </>
          ) : outcome.kind === "empty" ? (
            <p>
              Nothing available could be added right now
              {outcome.unavailable.length > 0 &&
                `: ${outcome.unavailable.join(", ")}`}
              .
            </p>
          ) : (
            <p className="text-chili">{outcome.presetName}</p>
          )}
        </div>
      )}

      {lines.length === 0 ? (
        <div className="rounded-2xl bg-counter border border-dashed border-line p-8 text-center">
          <p className="font-display font-bold text-lg">No items yet.</p>
          <p className="mt-1 text-sm text-ink-soft max-w-md mx-auto">
            Build your shopping list by adding products from {preset.shop_name}.
          </p>
          <Link
            href={`/shop/${preset.shop_id}?preset=${preset.id}`}
            className="mt-3 inline-block rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep"
          >
            + Add Items
          </Link>
        </div>
      ) : (
        <section className="rounded-2xl bg-counter border border-line overflow-hidden">
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <PresetItemRow
                key={l.product_id}
                presetId={preset.id}
                productId={l.product_id}
                name={l.product!.name}
                price={Number(l.product!.price)}
                unit={l.product!.unit}
                stock={l.product!.stock_quantity}
                available={l.product!.is_available}
                quantity={l.quantity}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PresetItemRow({
  presetId,
  productId,
  name,
  price,
  unit,
  stock,
  available,
  quantity,
}: {
  presetId: string;
  productId: string;
  name: string;
  price: number;
  unit: string;
  stock: number;
  available: boolean;
  quantity: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function write(next: number) {
    setBusy(true);
    try {
      if (next <= 0) await removePresetItem(presetId, productId);
      else await setPresetItemQty(presetId, productId, next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px] truncate">{name}</p>
        <p className="text-[13px] text-ink-soft tnum">
          ₹{price.toFixed(2)} / {unit}
          {(!available || stock <= 0) && (
            <span className="text-chili font-semibold"> · out of stock</span>
          )}
        </p>
      </div>
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={`Quantity of ${name} in preset`}
      >
        <button
          aria-label={`Decrease quantity of ${name}`}
          onClick={() => write(quantity - 1)}
          disabled={busy}
          className="w-8 h-8 rounded-lg border border-line font-bold hover:bg-ledger disabled:opacity-40"
        >
          −
        </button>
        <span aria-live="polite" className="w-8 text-center font-bold tnum">
          {quantity}
        </span>
        <button
          aria-label={`Increase quantity of ${name}`}
          onClick={() => write(quantity + 1)}
          disabled={busy || quantity >= stock}
          title={quantity >= stock ? `Only ${stock} in stock` : undefined}
          className="w-8 h-8 rounded-lg border border-line font-bold hover:bg-ledger disabled:opacity-40 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
      <span className="w-20 text-right font-bold text-sm tnum">
        ₹{(price * quantity).toFixed(2)}
      </span>
    </li>
  );
}
