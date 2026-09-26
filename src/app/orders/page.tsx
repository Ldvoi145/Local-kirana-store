import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { ExportCsvButton } from "@/components/export-csv";
import {
  customerTxCsv,
  filterTxRows,
  paymentBreakdown,
  toTxRow,
} from "@/lib/transactions";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  Pending: "bg-marigold-soft text-ink border-marigold",
  Preparing: "bg-ledger text-leaf border-leaf/30",
  Ready: "bg-leaf/10 text-leaf border-leaf/30",
  Completed: "bg-leaf text-white border-leaf",
  Cancelled: "bg-chili/10 text-chili border-chili/30",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    payment?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
}) {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/orders");
  const params = await searchParams;
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, shops(name), order_items(quantity)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (orders ?? []).map((o) =>
    toTxRow(o as unknown as Parameters<typeof toTxRow>[0]),
  );
  const filters = {
    status: params.status ?? "",
    type: "",
    payment: params.payment ?? "",
    from: params.from ?? "",
    to: params.to ?? "",
    q: params.q ?? "",
  };
  const filtered = filterTxRows(rows, filters);
  const paySplit = paymentBreakdown(filtered);
  const csv = customerTxCsv(filtered);
  const spent = filtered
    .filter((r) => r.status !== "Cancelled")
    .reduce((n, r) => n + r.total_amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display font-bold text-3xl flex-1">Your orders</h1>
        <ExportCsvButton
          csv={csv}
          filename="my-orders.csv"
          label={`Export CSV (${filtered.length})`}
        />
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-counter border border-line p-4">
          <p className="text-xs font-semibold text-ink-soft">Orders</p>
          <p className="font-display font-bold text-2xl">{filtered.length}</p>
        </div>
        <div className="rounded-2xl bg-counter border border-line p-4">
          <p className="text-xs font-semibold text-ink-soft">Spent</p>
          <p className="font-display font-bold text-2xl">₹{spent.toFixed(2)}</p>
        </div>
        {paySplit.slice(0, 2).map((p) => (
          <div key={p.payment} className="rounded-2xl bg-counter border border-line p-4">
            <p className="text-xs font-semibold text-ink-soft">{p.payment}</p>
            <p className="font-display font-bold text-2xl">₹{p.revenue.toFixed(0)}</p>
          </div>
        ))}
      </section>

      <form
        method="get"
        className="rounded-2xl bg-counter border border-line p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-2"
      >
        <select name="status" defaultValue={filters.status} aria-label="Filter by status" className="rounded-lg border border-line px-2 py-1.5 text-sm bg-ledger">
          <option value="">All statuses</option>
          {["Pending", "Preparing", "Ready", "Completed", "Cancelled"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="payment" defaultValue={filters.payment} aria-label="Filter by payment" className="rounded-lg border border-line px-2 py-1.5 text-sm bg-ledger">
          <option value="">All payments</option>
          <option value="Cash on Delivery">Cash on Delivery</option>
          <option value="UPI">UPI</option>
          <option value="Card">Card</option>
        </select>
        <input name="from" type="date" defaultValue={filters.from} aria-label="From date" className="rounded-lg border border-line px-2 py-1.5 text-sm" />
        <input name="to" type="date" defaultValue={filters.to} aria-label="To date" className="rounded-lg border border-line px-2 py-1.5 text-sm" />
        <input name="q" defaultValue={filters.q} placeholder="Search shop or order id" aria-label="Search orders" className="rounded-lg border border-line px-3 py-1.5 text-sm" />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <button className="flex-1 rounded-lg bg-leaf text-white text-sm font-semibold px-3 py-1.5 hover:bg-leaf-deep">
            Filter
          </button>
          <Link href="/orders" className="rounded-lg border border-line text-sm font-semibold px-3 py-1.5 hover:bg-ledger">
            Clear
          </Link>
        </div>
      </form>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-counter border border-line p-8 text-center text-sm text-ink-soft">
          No orders match. Fill a cart from a{" "}
          <Link href="/" className="text-leaf font-semibold">
            nearby shop
          </Link>
          .
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((o) => (
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
                  {o.shop_name} · {o.type === "Pickup" ? "Pickup" : "Delivery"} ·{" "}
                  {o.payment_method} · ₹{o.total_amount.toFixed(2)}
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
