import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderWithItems } from "@/lib/dal";
import { describeEvent, sortEvents } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getOrderWithItems(id);
  if (!data) notFound();
  const { order, items, events } = data;
  const timeline = sortEvents(events);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-2xl bg-counter border border-line p-6">
        <p className="text-sm text-ink-soft">Order confirmed</p>
        <h1 className="font-display font-bold text-3xl">
          #{order.id.slice(0, 8).toUpperCase()}
        </h1>
        <p className="text-sm text-ink-soft">
          {order.shop_name} · {order.type === "Pickup" ? "Store pickup" : "Home delivery"} ·{" "}
          {order.payment_method} · {order.status}
        </p>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between py-2 text-sm">
              <span>
                {i.name} × {i.quantity}
              </span>
              <span className="font-semibold">₹{Number(i.subtotal).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between py-3 font-display font-bold text-xl">
          <span>Total</span>
          <span>₹{Number(order.total_amount).toFixed(2)}</span>
        </div>
        <p className="text-sm text-ink-soft">
          {order.customer_name} · {order.customer_address}
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/orders"
            className="rounded-lg bg-leaf text-white text-sm font-semibold px-4 py-2 hover:bg-leaf-deep"
          >
            Track orders
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-line text-sm font-semibold px-4 py-2 hover:bg-ledger"
          >
            Back to shops
          </Link>
        </div>
      </div>

      <section className="rounded-2xl bg-counter border border-line p-6">
        <h2 className="font-display font-bold text-xl">Transaction trail</h2>
        <p className="text-xs text-ink-soft">
          Every handoff from your cart to the shop counter, recorded.
        </p>
        {timeline.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            Placed · {order.status}. Detailed events unlock after the next status change.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {timeline.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
              >
                <span className="font-semibold">{describeEvent(e)}</span>
                <span className="text-ink-soft text-xs">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
