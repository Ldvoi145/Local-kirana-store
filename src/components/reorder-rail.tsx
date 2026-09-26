"use client";

import { useCart } from "@/lib/cart";
import type { ReorderCandidate } from "@/lib/analytics";
import type { Product } from "@/lib/types";

export function ReorderRail({
  items,
  shopName,
}: {
  items: ReorderCandidate[];
  shopName: string;
}) {
  const { add } = useCart();
  return (
    <section
      aria-label="Picked for you"
      className="rounded-2xl bg-leaf text-white p-5"
    >
      <h2 className="font-display font-bold text-xl">Picked for you</h2>
      <p className="text-sm text-white/75">
        Based on your own order history at {shopName}.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.product_id}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{item.name}</p>
              <p className="text-xs text-white/70">
                Ordered {item.times_ordered}×
                {item.due ? " · due again" : ""}
                {item.avg_interval_days !== null
                  ? ` · every ~${item.avg_interval_days}d`
                  : ""}
              </p>
            </div>
            <button
              onClick={() =>
                add(
                  {
                    id: item.product_id,
                    shop_id: item.shop_id,
                    name: item.name,
                    price: item.price,
                    unit: item.unit,
                    category: "",
                    stock_quantity: 99,
                    is_available: true,
                    image_url: null,
                  } satisfies Product,
                  shopName,
                )
              }
              className="shrink-0 rounded-lg bg-marigold text-ink text-xs font-bold px-3 py-1.5 hover:brightness-95"
            >
              Reorder
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
