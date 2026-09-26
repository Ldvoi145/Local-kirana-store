"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { deletePreset } from "@/app/actions/shop";
import type { CartLine, Preset } from "@/lib/types";

export function PresetList({ presets }: { presets: Preset[] }) {
  const { replace } = useCart();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  if (presets.length === 0)
    return (
      <div className="rounded-2xl bg-counter border border-line p-8 text-center text-sm text-ink-soft">
        No presets yet. Fill a cart and save it as a preset such as “Monthly
        ration”, then reorder it here in one tap.
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
          const lines: CartLine[] = (p.items ?? [])
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
          const total = lines.reduce((n, l) => n + l.price * l.quantity, 0);
          return (
            <li
              key={p.id}
              className="rounded-2xl bg-counter border border-line p-5"
            >
              <h2 className="font-display font-bold text-xl">{p.name}</h2>
              <p className="text-sm text-ink-soft">
                {p.shop_name} · {lines.length} items · ₹{total.toFixed(2)}
              </p>
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
                  onClick={() => {
                    replace(lines);
                    router.push("/cart");
                  }}
                  disabled={lines.length === 0}
                  className="rounded-lg bg-marigold text-ink text-sm font-bold px-4 py-2 hover:brightness-95 disabled:opacity-50"
                >
                  Load into cart
                </button>
                <button
                  onClick={async () => {
                    try {
                      await deletePreset(p.id);
                      router.refresh();
                    } catch (e) {
                      setMessage(
                        e instanceof Error ? e.message : "Could not delete.",
                      );
                    }
                  }}
                  className="rounded-lg text-sm text-chili hover:underline px-2"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
