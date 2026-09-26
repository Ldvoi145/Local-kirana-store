"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPreset } from "@/app/actions/shop";

export interface PresetShopOption {
  id: string;
  name: string;
  product_count: number;
}

/**
 * Proper modal creation flow: choose a shop -> name the preset -> Create.
 * The preset is born EMPTY; items are added afterwards via Add Items.
 */
export function CreatePresetDialog({
  shops,
  initialShopId,
  onClose,
}: {
  shops: PresetShopOption[];
  initialShopId?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const initialShop = shops.find((s) => s.id === initialShopId) ?? null;
  const [shop, setShop] = useState<PresetShopOption | null>(initialShop);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!shop || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createPreset(shop.id, name);
      router.push(`/presets/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create preset.");
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-preset-title"
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-ink/45"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-counter border border-line p-5 space-y-4 shadow-pop max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!shop ? (
          <>
            <div>
              <h2
                id="create-preset-title"
                className="font-display font-bold text-xl"
              >
                Create a preset
              </h2>
              <p className="text-sm text-ink-soft">
                Choose a shop. A preset belongs to one shop only.
              </p>
            </div>
            {shops.length === 0 ? (
              <p className="text-sm text-ink-soft">
                No shops yet. Vendors add their first store from the Vendor
                page.
              </p>
            ) : (
              <ul className="space-y-2">
                {shops.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setShop(s)}
                      className="w-full flex items-center justify-between gap-2 rounded-xl border border-line px-4 py-3 hover:bg-ledger hover:border-leaf text-left"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold truncate">
                          {s.name}
                        </span>
                        <span className="block text-xs text-ink-soft tnum">
                          {s.product_count} products
                        </span>
                      </span>
                      <span aria-hidden className="text-leaf font-bold">
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-ledger"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <div>
              <h2
                id="create-preset-title"
                className="font-display font-bold text-xl"
              >
                Create preset
              </h2>
              <p className="text-sm text-ink-soft">
                Shop · <span className="font-semibold text-ink">{shop.name}</span>{" "}
                {!initialShop && (
                  <button
                    onClick={() => setShop(null)}
                    className="text-leaf font-semibold hover:underline ml-1"
                  >
                    Change
                  </button>
                )}
              </p>
            </div>
            <label className="block">
              <span className="text-sm font-semibold">Preset name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Weekly Groceries"
                aria-label="Preset name"
                maxLength={60}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") create();
                }}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-chili">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={busy}
                className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-ledger disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={busy || !name.trim()}
                className="flex-1 rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
