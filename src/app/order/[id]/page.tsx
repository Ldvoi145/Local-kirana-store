import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderWithItems } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getOrderWithItems(id);
  if (!data) notFound();
  const { order, items } = data;

  return (
    <div className="max-w-2xl mx-auto rounded-2xl bg-counter border border-line p-6">
      <p className="text-sm text-ink-soft">Order confirmed</p>
      <h1 className="font-display font-bold text-3xl">
        #{order.id.slice(0, 8).toUpperCase()}
      </h1>
      <p className="text-sm text-ink-soft">
        {order.shop_name} · {order.type === "Pickup" ? "Store pickup" : "Home delivery"} ·{" "}
        {order.status}
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
  );
}
