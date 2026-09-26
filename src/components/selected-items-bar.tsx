"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

/**
 * Separate buying card: appears on the shop page once items from THIS
 * shop are selected. Product cards only add to cart; this card alone
 * carries the selection into checkout.
 */
export function SelectedItemsBar({
  shopId,
  shopName,
}: {
  shopId: string;
  shopName: string;
}) {
  const { lines } = useCart();
  const selected = lines.filter((l) => l.shop_id === shopId);
  if (selected.length === 0) return null;

  const count = selected.reduce((n, l) => n + l.quantity, 0);
  const total = selected.reduce((n, l) => n + l.price * l.quantity, 0);

  return (
    <>
      <div aria-hidden className="h-20" />
      <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pt-2 bg-gradient-to-t from-ink/25 to-transparent pointer-events-none">
        <div className="pointer-events-auto max-w-6xl mx-auto rounded-2xl bg-leaf-deep text-white border border-white/15 shadow-pop px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold leading-tight tnum">
              {count} item{count === 1 ? "" : "s"} · ₹{total.toFixed(2)}
            </p>
            <p className="text-xs text-white/70 truncate">
              Selected from {shopName}
            </p>
          </div>
          <Link
            href="/cart"
            className="shrink-0 rounded-lg bg-marigold text-ink text-sm font-bold px-5 py-2.5 hover:brightness-95 active:brightness-90"
          >
            Review &amp; Buy →
          </Link>
        </div>
      </div>
    </>
  );
}
