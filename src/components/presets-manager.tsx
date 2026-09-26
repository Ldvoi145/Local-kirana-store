"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreatePresetDialog,
  type PresetShopOption,
} from "@/components/create-preset-dialog";import { usePresetOrder } from "@/components/use-preset-order";
import { deletePreset, renamePreset } from "@/app/actions/shop";
import type { Preset } from "@/lib/types";

function cardLines(p: Preset) {
  return (p.items ?? []).filter((i) => i.product);
}

function cardTotal(p: Preset) {
  return cardLines(p).reduce(
    (n, i) => n + Number(i.product!.price) * i.quantity,
    0,
  );
}

export function PresetsManager({
  presets,
  shops,
  initialCreateShopId,
}: {
  presets: Preset[];
  shops: PresetShopOption[];
  initialCreateShopId?: string | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(!!initialCreateShopId);
  const { orderPreset, busyId, outcome } = usePresetOrder();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-52">
          <h1 className="font-display font-bold text-3xl tracking-tight">
            Presets
          </h1>
          <p className="text-sm text-ink-soft">Your saved shopping lists</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          aria-label="Create preset"
          title="Create preset"
          className="rounded-lg bg-leaf text-white font-bold w-10 h-10 text-xl leading-none hover:bg-leaf-deep active:bg-leaf-deep grid place-items-center"
        >
          +
        </button>
      </div>

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
                <div className="text-ink">
                  <p className="font-semibold">
                    {outcome.addedCount} of{" "}
                    {outcome.addedCount + outcome.unavailable.length} items were
                    added to your cart.
                  </p>
                  <p>Unavailable:</p>
                  <ul className="list-disc ml-5">
                    {outcome.unavailable.map((n) => (
                      <li key={n}>• {n}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Link
                href="/cart"
                className="inline-block mt-1 rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep"
              >
                View Cart
              </Link>
            </>
          ) : outcome.kind === "empty" ? (
            <>
              <p className="font-semibold">{outcome.presetName}</p>
              <p className="text-ink-soft">
                Nothing available could be added right now.
              </p>
              {outcome.unavailable.length > 0 && (
                <ul className="list-disc ml-5">
                  {outcome.unavailable.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-chili">{outcome.presetName}</p>
          )}
        </div>
      )}

      {presets.length === 0 ? (
        <div className="rounded-2xl bg-counter border border-dashed border-line p-8 text-center">
          <p className="font-display font-bold text-lg">No presets yet</p>
          <p className="mt-1 text-sm text-ink-soft max-w-md mx-auto">
            Tap + to pick a shop, name a list such as “Weekly Groceries”, then
            add products from that shop. Your lists survive refresh and login.
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-3 rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep"
          >
            + Create your first preset
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {presets.map((p) => (
            <PresetCard
              key={p.id}
              preset={p}
              ordering={busyId === p.id}
              onOrder={() => orderPreset(p.id, p.name)}
            />
          ))}
        </ul>
      )}

      {dialogOpen && (
        <CreatePresetDialog
          shops={shops}
          initialShopId={initialCreateShopId}
          onClose={() => {
            setDialogOpen(false);
            if (typeof window !== "undefined") {
              // Drop ?create= from the URL when the dialog closes.
              const url = new URL(window.location.href);
              if (url.searchParams.has("create")) {
                url.searchParams.delete("create");
                window.history.replaceState(null, "", url.toString());
              }
            }
          }}
        />
      )}
    </div>
  );
}

function PresetCard({
  preset,
  ordering,
  onOrder,
}: {
  preset: Preset;
  ordering: boolean;
  onOrder: () => void;
}) {
  const router = useRouter();
  const lines = cardLines(preset);
  const total = cardTotal(preset);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(preset.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      await deletePreset(preset.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl bg-counter border border-line p-5 lift">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Preset name"
                maxLength={60}
                autoFocus
                className="flex-1 min-w-0 rounded-lg border border-line px-2.5 py-1.5 text-sm font-semibold"
              />
              <button
                onClick={saveName}
                disabled={busy || !name.trim()}
                className="rounded-lg bg-leaf text-white text-xs font-bold px-3 hover:bg-leaf-deep disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setRenaming(false);
                  setName(preset.name);
                }}
                className="rounded-lg border border-line text-xs font-semibold px-3 hover:bg-ledger"
              >
                Cancel
              </button>
            </div>
          ) : (
            <h2 className="font-display font-bold text-xl tracking-tight truncate">
              {preset.name}
            </h2>
          )}
          <p className="text-[13px] text-ink-soft tnum">
            {preset.shop_name} · {lines.length} item
            {lines.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Options for ${preset.name}`}
            className="w-9 h-9 grid place-items-center rounded-lg border border-line text-lg font-bold hover:bg-ledger"
          >
            ⋮
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label={`${preset.name} options`}
              className="absolute right-0 mt-1 w-44 rounded-xl bg-counter border border-line shadow-pop p-1 z-10"
            >
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setRenaming(true);
                }}
                className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-ledger"
              >
                Rename
              </button>
              <Link
                role="menuitem"
                href={`/presets/${preset.id}`}
                className="block rounded-lg px-3 py-2 text-sm hover:bg-ledger"
              >
                Edit items
              </Link>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
                className="w-full text-left rounded-lg px-3 py-2 text-sm text-chili hover:bg-ledger"
              >
                Delete preset
              </button>
            </div>
          )}
        </div>
      </div>

      {lines.length > 0 ? (
        <ul className="mt-2 text-sm space-y-0.5">
          {lines.slice(0, 4).map((l) => (
            <li key={l.product_id} className="truncate tnum">
              {l.product!.name} × {l.quantity}
            </li>
          ))}
          {lines.length > 4 && (
            <li className="text-ink-soft">+ {lines.length - 4} more</li>
          )}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">
          No items yet — open it and tap + Add Items.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-1 text-xs text-chili">
          {error}
        </p>
      )}

      {confirmDelete ? (
        <div className="mt-3 rounded-xl border border-chili/30 bg-chili/5 p-3 text-sm">
          <p className="font-semibold">Delete “{preset.name}”?</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={destroy}
              disabled={busy}
              className="rounded-lg bg-chili text-white text-xs font-bold px-3 py-1.5 hover:brightness-95 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-line text-xs font-semibold px-3 py-1.5 hover:bg-ledger"
            >
              Keep
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-2">
          <span className="text-sm tnum">
            Estimated{" "}
            <span className="font-bold">₹{total.toFixed(2)}</span>
          </span>
          <div className="flex gap-2">
            <Link
              href={`/presets/${preset.id}`}
              className="rounded-lg border border-leaf text-leaf text-sm font-semibold px-3 py-2 hover:bg-leaf/5"
            >
              {lines.length > 0 ? "Edit" : "+ Add Items"}
            </Link>
            <button
              onClick={onOrder}
              disabled={ordering || lines.length === 0}
              className="rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep active:bg-leaf-deep disabled:opacity-50"
            >
              {ordering ? "Ordering…" : "Order"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
