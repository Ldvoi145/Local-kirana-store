import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  Pending: "bg-marigold-soft text-ink border-marigold",
  Preparing: "bg-ledger text-leaf border-leaf/30",
  Ready: "bg-leaf/10 text-leaf border-leaf/30",
  Completed: "bg-leaf text-white border-leaf",
  Cancelled: "bg-chili/10 text-chili border-chili/30",
};

export default async function OrdersPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/orders");
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, shops(name)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="font-display font-bold text-3xl">Your orders</h1>
      {(orders ?? []).length === 0 ? (
        <div className="rounded-2xl bg-counter border border-line p-8 text-center text-sm text-ink-soft">
          No orders yet. Fill a cart from a{" "}
          <Link href="/" className="text-leaf font-semibold">
            nearby shop
          </Link>
          .
        </div>
      ) : (
        <ul className="grid gap-3">
          {(orders ?? []).map((o) => (
            <li
              key={o.id}
              className="rounded-2xl bg-counter border border-line p-4 flex flex-wrap items-center gap-3"
            >
              <div className="flex-1 min-w-44">
                <Link
                  href={`/order/${o.id}`}
                  className="font-display font-bold text-lg hover:underline"
                >
                  #{o.id.slice(0, 8).toUpperCase()}
                </Link>
                <p className="text-sm text-ink-soft">
                  {(o as unknown as { shops: { name: string } }).shops?.name} ·{" "}
                  {o.type === "Pickup" ? "Pickup" : "Delivery"} · ₹
                  {Number(o.total_amount).toFixed(2)}
                </p>
              </div>
              <span
                className={`rounded-full text-xs font-semibold px-2.5 py-0.5 border ${STATUS_STYLE[o.status] ?? ""}`}
              >
                {o.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
