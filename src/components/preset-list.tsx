"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { deletePreset } from "@/app/actions/shop";
import type { CartLine, Preset } from "@/lib/types";

export function PresetList({ presets }: { presets: Preset[] }) {
  const { replace } = useCart();
  const [message, setMessage] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  function linesFor(p: Preset): CartLine[] {
    return (p.items ?? [])
      .filter((i) => i.product)
      .map((i) => ({
        product_id: i.product_id,
        name: i.product!.name,
        price: Number(i.product!.price),
        unit: i.product!.unit,
        shop_id: p.shop_id,
        shop_name: p.shop_name ?? "",
        quantity: i.quantity,
      }));
  }

  function load(p: Preset) {
    const lines = linesFor(p);
    if (lines.length === 0) {
      setMessage(`“${p.name}” has no available items right now.`);
      return;
    }
    setLoadingId(p.id);
    setMessage(`Loading “${p.name}” into your cart…`);
    replace(lines);
    router.push("/cart");
  }

  if (presets.length === 0)
    return (
      <div className="rounded-2xl bg-counter border border-line p-8 text-center">
        <p className="text-sm text-ink-soft">
          No presets yet. Fill a cart and save it as a preset such as “Monthly
          ration”, then reorder it here in one tap.
        </p>
        <Link
          href="/"
          className="mt-3 inline-block rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep"
        >
          Browse shops to build one
        </Link>
      </div>
    );

  return (
    <div className="space-y-3">
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {presets.map((p) => {
          const lines = linesFor(p);
          const total = lines.reduce((n, l) => n + l.price * l.quantity, 0);
          const loading = loadingId === p.id;
          const deleting = deletingId === p.id;
          return (
            <li
              key={p.id}
              className="rounded-2xl bg-counter border border-line p-5 lift"
            >
              <button
                onClick={() => load(p)}
                disabled={lines.length === 0 || loading}
                aria-label={`Load preset ${p.name} into cart`}
                className="w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <h2 className="font-display font-bold text-xl hover:underline">
                  {p.name}
                </h2>
                <p className="text-sm text-ink-soft">
                  {p.shop_name} · {lines.length} items · ₹{total.toFixed(2)}
                </p>
              </button>
              <ul className="mt-2 text-sm space-y-0.5">
                {lines.slice(0, 5).map((l) => (
                  <li key={l.product_id} className="truncate">
                    · {l.name} × {l.quantity}
                  </li>
                ))}
                {lines.length > 5 && (
                  <li className="text-ink-soft">
                    · and {lines.length - 5} more
                  </li>
                )}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => load(p)}
                  disabled={lines.length === 0 || loading}
                  className="rounded-lg bg-leaf text-white text-sm font-bold px-4 py-2 hover:bg-leaf-deep active:bg-leaf-deep disabled:opacity-50"
                >
                  {loading ? "Loading…" : "Order again"}
                </button>
                <button
                  onClick={async () => {
                    setDeletingId(p.id);
                    try {
                      await deletePreset(p.id);
                      router.refresh();
                    } catch (e) {
                      setMessage(
                        e instanceof Error ? e.message : "Could not delete.",
                      );
                    } finally {
                      setDeletingId(null);
                    }
                  }}
                  disabled={deleting}
                  className="rounded-lg text-sm text-chili hover:underline px-2 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
