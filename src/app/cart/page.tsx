"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { checkout } from "@/app/actions/shop";
import { PAYMENT_METHODS } from "@/lib/types";

export default function CartPage() {
  const { lines, total, shopName, setQty, remove, clear } = useCart();
  const [orderType, setOrderType] = useState<"Pickup" | "Delivery">("Pickup");
  const [payment, setPayment] = useState<string>(PAYMENT_METHODS[0]);
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function placeOrder() {
    setBusy(true);
    setMessage(null);
    try {
      const orderId = await checkout(lines, orderType, address, payment);
      clear();
      router.push(`/order/${orderId}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not place the order.");
    } finally {
      setBusy(false);
    }
  }

  if (lines.length === 0)
    return (
      <div className="rounded-2xl bg-counter border border-line p-8 text-center">
        <h1 className="font-display font-bold text-2xl">Your cart is empty</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Walk down the street on the <Link href="/" className="text-leaf font-semibold">home page</Link> and
          fill it from a nearby rate board.
        </p>
      </div>
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl bg-counter border border-line overflow-hidden h-fit">
        <h1 className="font-display font-bold text-2xl px-4 pt-4">
          Cart · {shopName}
        </h1>
        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li key={l.product_id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] truncate">{l.name}</p>
                <p className="text-[13px] text-ink-soft tnum">
                  ₹{l.price.toFixed(2)} / {l.unit}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  aria-label={`Decrease quantity of ${l.name}`}
                  onClick={() => setQty(l.product_id, l.quantity - 1)}
                  className="w-8 h-8 rounded-lg border border-line font-bold hover:bg-ledger"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold">{l.quantity}</span>
                <button
                  aria-label={`Increase quantity of ${l.name}`}
                  onClick={() => setQty(l.product_id, l.quantity + 1)}
                  className="w-8 h-8 rounded-lg border border-line font-bold hover:bg-ledger"
                >
                  +
                </button>
              </div>
              <span className="w-20 text-right font-bold tnum">
                ₹{(l.price * l.quantity).toFixed(2)}
              </span>
              <button
                onClick={() => remove(l.product_id)}
                className="text-sm text-chili hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="p-4 flex justify-between items-center border-t border-line">
          <button onClick={clear} className="text-sm text-ink-soft hover:underline">
            Clear cart
          </button>
          <p className="font-display font-bold text-xl tnum">₹{total.toFixed(2)}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-counter border border-line p-5 space-y-4 h-fit">
        <div>
          <h2 className="font-display font-bold text-xl">Checkout</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["Pickup", "Delivery"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                aria-pressed={orderType === t}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  orderType === t
                    ? "bg-leaf text-white border-leaf"
                    : "border-line hover:bg-ledger"
                }`}
              >
                {t === "Pickup" ? "Store pickup" : "Home delivery"}
              </button>
            ))}
          </div>
          {orderType === "Delivery" && (
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House, street, landmark"
              aria-label="Delivery address"
              rows={2}
              className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
          )}
          <p className="mt-2 text-sm text-ink-soft">Pay cash or UPI at pickup or the doorstep.</p>
          <label className="mt-2 block">
            <span className="text-sm font-semibold">Payment mode</span>
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              aria-label="Payment mode"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm bg-counter"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          onClick={placeOrder}
          disabled={busy}
          className="w-full rounded-lg bg-leaf text-white font-bold py-2.5 hover:bg-leaf-deep active:bg-leaf-deep disabled:opacity-50 tnum"
        >
          {busy ? "Placing order…" : `Place order · ₹${total.toFixed(2)}`}
        </button>
        <div className="border-t border-line pt-4">
          <h3 className="font-semibold text-sm">Make this a reusable list</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Presets live in the Presets tab: pick the shop, name the list,
            then add items.
          </p>
          <Link
            href="/presets"
            className="mt-2 inline-block rounded-lg bg-counter border border-leaf text-leaf text-sm font-semibold px-4 py-2 hover:bg-leaf/5"
          >
            Go to Presets
          </Link>
        </div>
        {message && (
          <p role="status" className="text-sm text-ink">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
