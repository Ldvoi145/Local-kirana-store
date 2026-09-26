import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  getBestsellers,
  getRestockSuggestions,
} from "@/lib/analytics";
import {
  deleteProduct,
  toggleShopOpen,
  updateOrderStatus,
  updateProduct,
  updateSuggestionStatus,
} from "@/app/actions/shop";
import { ClaimButton, CreateShopForm } from "@/components/shop-setup";
import { AddProductForm } from "@/components/inventory-forms";
import { ShopQR } from "@/components/shop-qr";
import { ExportCsvButton } from "@/components/export-csv";
import {
  filterTxRows,
  paymentBreakdown,
  toTxRow,
  vendorTxCsv,
} from "@/lib/transactions";

export const dynamic = "force-dynamic";

type Tab = "orders" | "inventory" | "insights" | "transactions" | "requests";

export default async function VendorPage({
  searchParams,
}: {
  searchParams: Promise<{
    shop?: string;
    tab?: string;
    status?: string;
    type?: string;
    payment?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
}) {
  const { user, profile } = await getSession();
  if (!user) redirect("/login?next=/vendor");
  if (profile?.role !== "vendor")
    return (
      <Gate text="This area is for shopkeepers. Your account is registered as a customer." />
    );

  const supabase = await createClient();
  const { data: allShops } = await supabase
    .from("shops")
    .select("*")
    .order("name");
  const owned = (allShops ?? []).filter((s) => s.owner_id === user.id);
  const unclaimed = (allShops ?? []).filter((s) => s.owner_id === null);

  const params = await searchParams;
  const shop = owned.find((s) => s.id === params.shop) ?? owned[0] ?? null;
  if (!shop)
    return (
      <div className="space-y-4">
        <Gate text="Your shopkeeper account has no store yet. Claim a demo shop below or add your own." />
        <ClaimOrCreate unclaimed={unclaimed} />
      </div>
    );
  const tab: Tab =
    params.tab === "inventory" ||
    params.tab === "insights" ||
    params.tab === "transactions" ||
    params.tab === "requests"
      ? params.tab
      : "orders";

  const [{ data: orders }, { data: products }, { data: suggestions }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("*")
        .eq("shop_id", shop.id)
        .order("name"),
      supabase
        .from("suggestions")
        .select("*")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false }),
    ]);

  const txRows = (orders ?? []).map((o) =>
    toTxRow(o as unknown as Parameters<typeof toTxRow>[0]),
  );
  const txFilters = {
    status: params.status ?? "",
    type: params.type ?? "",
    payment: params.payment ?? "",
    from: params.from ?? "",
    to: params.to ?? "",
    q: params.q ?? "",
  };
  const filteredTx = filterTxRows(txRows, txFilters);
  const paySplit = paymentBreakdown(filteredTx);
  const txCsv = vendorTxCsv(filteredTx);

  const revenue = (orders ?? [])
    .filter((o) => o.status !== "Cancelled")
    .reduce((n, o) => n + Number(o.total_amount), 0);
  const lowStock = (products ?? []).filter(
    (p) => p.stock_quantity <= 5,
  ).length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-counter border border-line p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-52">
            <p className="text-xs font-semibold text-ink-soft">
              Merchant dashboard
            </p>
            <h1 className="font-display font-bold text-2xl">{shop.name}</h1>
            <p className="text-sm text-ink-soft">
              {shop.address} · {shop.is_open ? "Open" : "Closed"}
            </p>
          </div>
          <form action={toggleShopOpen.bind(null, shop.id, !shop.is_open)}>
            <button className="rounded-lg border border-line text-sm font-semibold px-3 py-1.5 hover:bg-ledger">
              Mark {shop.is_open ? "closed" : "open"}
            </button>
          </form>
          <Link
            href={`/shop/${shop.id}`}
            className="rounded-lg bg-leaf text-white text-sm font-semibold px-3 py-1.5 hover:bg-leaf-deep"
          >
            View customer store
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {owned.map((s) => (
            <Link
              key={s.id}
              href={`/vendor?shop=${s.id}&tab=${tab}`}
              aria-current={s.id === shop.id}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                s.id === shop.id
                  ? "bg-leaf text-white border-leaf"
                  : "border-line hover:bg-ledger"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total orders" value={String(orders?.length ?? 0)} />
        <Stat label="Revenue" value={`₹${revenue.toFixed(2)}`} />
        <Stat label="Catalog items" value={String(products?.length ?? 0)} />
        <Stat label="Low stock" value={String(lowStock)} alert={lowStock > 0} />
      </section>

      <nav className="flex gap-1 rounded-2xl bg-counter border border-line p-1.5" aria-label="Vendor sections">
        {(["orders", "transactions", "requests", "inventory", "insights"] as Tab[]).map((t) => (
          <Link
            key={t}
            href={`/vendor?shop=${shop.id}&tab=${t}`}
            aria-current={t === tab}
            className={`flex-1 text-center rounded-xl px-3 py-2 text-sm font-semibold capitalize ${
              t === tab ? "bg-leaf text-white" : "hover:bg-ledger"
            }`}
          >
            {t === "orders"
              ? `Orders (${orders?.length ?? 0})`
              : t === "transactions"
                ? `Transactions (${filteredTx.length})`
                : t === "requests"
                  ? `Requests (${suggestions?.length ?? 0})`
                  : t === "inventory"
                    ? `Inventory (${products?.length ?? 0})`
                    : "Insights"}
          </Link>
        ))}
      </nav>

      {tab === "orders" && (
        <OrdersPane
          shopId={shop.id}
          orders={(orders ?? []) as unknown as OrderRow[]}
        />
      )}
      {tab === "inventory" && (
        <InventoryPane
          shopId={shop.id}
          products={(products ?? []) as unknown as ProductRow[]}
        />
      )}
      {tab === "insights" && <InsightsPane shopId={shop.id} />}

      {tab === "transactions" && (
        <TransactionsPane
          shopId={shop.id}
          rows={filteredTx}
          filters={txFilters}
          paySplit={paySplit}
          csv={txCsv}
        />
      )}

      {tab === "requests" && (
        <RequestsPane
          shopId={shop.id}
          suggestions={(suggestions ?? []) as unknown as SuggestionRow[]}
        />
      )}

      <ShopQR shopId={shop.id} shopName={shop.name} />

      <ClaimOrCreate unclaimed={unclaimed} />
    </div>
  );
}

function ClaimOrCreate({
  unclaimed,
}: {
  unclaimed: { id: string; name: string; address: string | null }[];
}) {
  return (
    <section className="rounded-2xl bg-counter border border-line p-5">
      <h2 className="font-display font-bold text-xl">Your stores</h2>
      <p className="text-sm text-ink-soft">
        You manage only stores you own. Claim a demo shop or add your own.
      </p>
      {unclaimed.length > 0 && (
        <ul className="mt-3 space-y-2">
          {unclaimed.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
            >
              <span className="flex-1 font-semibold">
                {s.name}
                <span className="block font-normal text-ink-soft text-xs">
                  Unclaimed demo shop
                </span>
              </span>
              <ClaimButton shopId={s.id} shopName={s.name} />
            </li>
          ))}
        </ul>
      )}
      <CreateShopForm />
    </section>
  );
}

function Gate({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-counter border border-line p-8 text-center">
      <h1 className="font-display font-bold text-2xl">Vendor area</h1>
      <p className="mt-1 text-sm text-ink-soft">{text}</p>
      <Link href="/" className="text-leaf font-semibold text-sm">
        Back to shops
      </Link>
    </div>
  );
}

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-counter border border-line p-4">
      <p className="text-xs font-semibold text-ink-soft">{label}</p>
      <p
        className={`font-display font-bold text-2xl ${alert ? "text-chili" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

interface OrderRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  type: string;
  status: string;
  total_amount: number;
  order_items: { product_id: string; name: string; quantity: number }[];
}

function OrdersPane({ shopId, orders }: { shopId: string; orders: OrderRow[] }) {
  if (orders.length === 0)
    return (
      <div className="rounded-2xl bg-counter border border-line p-8 text-center text-sm text-ink-soft">
        No orders yet. Place a test order from the customer storefront to see it
        arrive here live.
      </div>
    );
  return (
    <div className="rounded-2xl bg-counter border border-line p-4 overflow-x-auto">
      <table className="w-full text-sm min-w-150">
        <thead>
          <tr className="text-left text-xs text-ink-soft border-b border-line">
            <th className="py-2 pr-3">Order</th>
            <th className="py-2 pr-3">Customer</th>
            <th className="py-2 pr-3">Items</th>
            <th className="py-2 pr-3">Total</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2">Advance</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-line last:border-0 align-top">
              <td className="py-2 pr-3 font-bold">
                #{o.id.slice(0, 8).toUpperCase()}
                <span className="block font-normal text-ink-soft text-xs">
                  {o.type === "Delivery" ? "Home delivery" : "Pickup"}
                </span>
              </td>
              <td className="py-2 pr-3">
                {o.customer_name}
                <span className="block text-ink-soft text-xs">
                  {o.customer_phone}
                </span>
              </td>
              <td className="py-2 pr-3">
                <ul>
                  {o.order_items.map((i) => (
                    <li key={i.product_id}>
                      · {i.name} × <strong>{i.quantity}</strong>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="py-2 pr-3 font-bold text-leaf">
                ₹{Number(o.total_amount).toFixed(2)}
              </td>
              <td className="py-2 pr-3">{o.status}</td>
              <td className="py-2">
                <form
                  action={updateOrderStatus.bind(null, o.id, shopId)}
                  className="flex gap-1"
                >
                  <select
                    name="status"
                    defaultValue={o.status}
                    aria-label={`Status for order ${o.id.slice(0, 8)}`}
                    className="rounded-lg border border-line text-sm px-2 py-1 bg-ledger"
                  >
                    {["Pending", "Preparing", "Ready", "Completed", "Cancelled"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ),
                    )}
                  </select>
                  <button
                    type="submit"
                    aria-label="Save status"
                    className="rounded-lg border border-line px-2 text-sm font-bold hover:bg-ledger"
                  >
                    ✓
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TxFilterState {
  status: string;
  type: string;
  payment: string;
  from: string;
  to: string;
  q: string;
}

interface TxDisplayRow {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  shop_name: string;
  type: string;
  payment_method: string;
  status: string;
  item_count: number;
  total_amount: number;
}

function TransactionsPane({
  shopId,
  rows,
  filters,
  paySplit,
  csv,
}: {
  shopId: string;
  rows: TxDisplayRow[];
  filters: TxFilterState;
  paySplit: { payment: string; orders: number; revenue: number }[];
  csv: string;
}) {
  const revenue = rows
    .filter((r) => r.status !== "Cancelled")
    .reduce((n, r) => n + r.total_amount, 0);
  const base = `/vendor?shop=${shopId}&tab=transactions`;
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Transactions" value={String(rows.length)} />
        <Stat label="Collected" value={`₹${revenue.toFixed(2)}`} />
        <Stat
          label="UPI share"
          value={
            paySplit.length === 0
              ? "—"
              : `${Math.round(((paySplit.find((p) => p.payment === "UPI")?.revenue ?? 0) / Math.max(revenue, 1)) * 100)}%`
          }
        />
        <div className="rounded-2xl bg-counter border border-line p-4 flex items-end">
          <ExportCsvButton
            csv={csv}
            filename={`transactions-${shopId.slice(0, 8)}.csv`}
            label={`Export CSV (${rows.length})`}
          />
        </div>
      </section>

      <form
        method="get"
        className="rounded-2xl bg-counter border border-line p-4 grid sm:grid-cols-3 lg:grid-cols-6 gap-2"
      >
        <input type="hidden" name="shop" value={shopId} />
        <input type="hidden" name="tab" value="transactions" />
        <select name="status" defaultValue={filters.status} aria-label="Filter by status" className="rounded-lg border border-line px-2 py-1.5 text-sm bg-ledger">
          <option value="">All statuses</option>
          {["Pending", "Preparing", "Ready", "Completed", "Cancelled"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="type" defaultValue={filters.type} aria-label="Filter by type" className="rounded-lg border border-line px-2 py-1.5 text-sm bg-ledger">
          <option value="">Pickup + Delivery</option>
          <option value="Pickup">Pickup</option>
          <option value="Delivery">Delivery</option>
        </select>
        <select name="payment" defaultValue={filters.payment} aria-label="Filter by payment" className="rounded-lg border border-line px-2 py-1.5 text-sm bg-ledger">
          <option value="">All payments</option>
          <option value="Cash on Delivery">Cash on Delivery</option>
          <option value="UPI">UPI</option>
          <option value="Card">Card</option>
        </select>
        <input name="from" type="date" defaultValue={filters.from} aria-label="From date" className="rounded-lg border border-line px-2 py-1.5 text-sm" />
        <input name="to" type="date" defaultValue={filters.to} aria-label="To date" className="rounded-lg border border-line px-2 py-1.5 text-sm" />
        <input name="q" defaultValue={filters.q} placeholder="Search id, customer, phone" aria-label="Search transactions" className="rounded-lg border border-line px-3 py-1.5 text-sm sm:col-span-2 lg:col-span-4" />
        <div className="flex gap-2 sm:col-span-1 lg:col-span-2">
          <button className="flex-1 rounded-lg bg-leaf text-white text-sm font-semibold px-3 py-1.5 hover:bg-leaf-deep">
            Filter
          </button>
          <Link href={base} className="rounded-lg border border-line text-sm font-semibold px-3 py-1.5 hover:bg-ledger">
            Clear
          </Link>
        </div>
      </form>

      {paySplit.length > 0 && (
        <section className="rounded-2xl bg-counter border border-line p-4">
          <h2 className="font-display font-bold text-lg">Payment breakdown</h2>
          <ul className="mt-2 grid sm:grid-cols-3 gap-2">
            {paySplit.map((p) => (
              <li key={p.payment} className="rounded-xl border border-line px-3 py-2 text-sm">
                <p className="font-semibold">{p.payment}</p>
                <p className="text-ink-soft">
                  {p.orders} orders · ₹{p.revenue.toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-2xl bg-counter border border-line p-4 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-4 text-center text-sm text-ink-soft">
            No transactions match these filters.
          </p>
        ) : (
          <table className="w-full text-sm min-w-170">
            <thead>
              <tr className="text-left text-xs text-ink-soft border-b border-line">
                <th className="py-2 pr-3">Order</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Payment</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Items</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 font-bold">
                    #{r.id.slice(0, 8).toUpperCase()}
                    <span className="block font-normal text-ink-soft text-xs">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {r.customer_name}
                    <span className="block text-ink-soft text-xs">{r.customer_phone}</span>
                  </td>
                  <td className="py-2 pr-3">{r.type}</td>
                  <td className="py-2 pr-3">{r.payment_method}</td>
                  <td className="py-2 pr-3">{r.status}</td>
                  <td className="py-2 pr-3 text-right">{r.item_count}</td>
                  <td className="py-2 text-right font-bold text-leaf">
                    ₹{r.total_amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

interface SuggestionRow {
  id: string;
  customer_name: string;
  item_name: string;
  note: string;
  status: string;
  created_at: string;
}

function RequestsPane({
  shopId,
  suggestions,
}: {
  shopId: string;
  suggestions: SuggestionRow[];
}) {
  const pending = suggestions.filter((s) => s.status === "Pending").length;
  if (suggestions.length === 0)
    return (
      <div className="rounded-2xl bg-counter border border-line p-8 text-center text-sm text-ink-soft">
        No customer requests yet. When a customer asks for an item from your
        rate board, it lands here.
      </div>
    );
  return (
    <div className="rounded-2xl bg-counter border border-line p-4 space-y-2">
      <p className="text-sm text-ink-soft">
        {pending} waiting · approve what you&apos;ll stock, reject what you won&apos;t.
        Mark Added once it&apos;s on the rate board.
      </p>
      <ul className="divide-y divide-line">
        {suggestions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 py-3">
            <div className="flex-1 min-w-44">
              <p className="font-semibold">{s.item_name}</p>
              <p className="text-xs text-ink-soft">
                {s.customer_name} · {new Date(s.created_at).toLocaleString()}
                {s.note ? ` · “${s.note}”` : ""}
              </p>
            </div>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold">
              {s.status}
            </span>
            <form
              action={updateSuggestionStatus.bind(null, shopId, s.id)}
              className="flex gap-1"
            >
              <select
                name="status"
                defaultValue={s.status}
                aria-label={`Status for request ${s.item_name}`}
                className="rounded-lg border border-line text-sm px-2 py-1 bg-ledger"
              >
                {["Pending", "Approved", "Rejected", "Added"].map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                aria-label="Save request status"
                className="rounded-lg border border-line px-2 text-sm font-bold hover:bg-ledger"
              >
                ✓
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock_quantity: number;
  is_available: boolean;
}

function InventoryPane({
  shopId,
  products,
}: {
  shopId: string;
  products: ProductRow[];
}) {
  return (
    <div className="rounded-2xl bg-counter border border-line p-4 space-y-4">
      <AddProductForm shopId={shopId} />

      <ul className="divide-y divide-line">
        {products.map((p) => (
          <li key={p.id} className="py-3">
            <details>
              <summary className="cursor-pointer list-none flex flex-wrap items-center gap-2">
                <span className="font-semibold flex-1 min-w-40">{p.name}</span>
                <span className="text-xs text-ink-soft">{p.category}</span>
                <span className="font-bold text-leaf text-sm">
                  ₹{Number(p.price).toFixed(2)}
                </span>
                <span
                  className={`rounded-full text-xs font-semibold px-2.5 py-0.5 border ${
                    p.stock_quantity > 5
                      ? "bg-leaf/10 text-leaf border-leaf/30"
                      : p.stock_quantity > 0
                        ? "bg-marigold-soft text-ink border-marigold"
                        : "bg-chili/10 text-chili border-chili/30"
                  }`}
                >
                  {p.stock_quantity} in stock
                </span>
                <span className="text-xs text-ink-soft">Edit</span>
              </summary>
              <div className="mt-2 flex flex-wrap gap-2 items-end">
                <form
                  action={updateProduct.bind(null, shopId, p.id)}
                  className="grid sm:grid-cols-3 gap-2 flex-1 min-w-60"
                >
                  <input name="name" defaultValue={p.name} required aria-label="Name" className="rounded-lg border border-line px-3 py-1.5 text-sm" />
                  <input name="category" defaultValue={p.category} required aria-label="Category" className="rounded-lg border border-line px-3 py-1.5 text-sm" />
                  <input name="unit" defaultValue={p.unit} required aria-label="Unit" className="rounded-lg border border-line px-3 py-1.5 text-sm" />
                  <input name="price" type="number" step="0.5" defaultValue={p.price} required aria-label="Price" className="rounded-lg border border-line px-3 py-1.5 text-sm" />
                  <input name="stock_quantity" type="number" min="0" defaultValue={p.stock_quantity} required aria-label="Stock" className="rounded-lg border border-line px-3 py-1.5 text-sm" />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_available" defaultChecked={p.is_available} />
                    Available
                  </label>
                  <button className="rounded-lg bg-leaf text-white text-sm font-semibold px-4 py-1.5 hover:bg-leaf-deep">
                    Save
                  </button>
                </form>
                <form action={deleteProduct.bind(null, shopId, p.id)}>
                  <button className="rounded-lg text-sm text-chili hover:underline px-2 py-1.5">
                    Delete
                  </button>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function InsightsPane({ shopId }: { shopId: string }) {
  const supabase = await createClient();
  const [bestsellers, { restock, skip }] = await Promise.all([
    getBestsellers(supabase, shopId, 30),
    getRestockSuggestions(supabase, shopId, 30),
  ]);

  if (bestsellers.length === 0)
    return (
      <div className="rounded-2xl bg-counter border border-line p-8 text-center text-sm text-ink-soft">
        Insights unlock after your first orders. Sales velocity, slow movers,
        and restock tickets will appear here.
      </div>
    );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl bg-counter border border-line p-4">
        <h2 className="font-display font-bold text-xl">Selling the most</h2>
        <p className="text-xs text-ink-soft">Last 30 days, by quantity sold.</p>
        <ol className="mt-2 divide-y divide-line">
          {bestsellers.slice(0, 8).map((b, i) => (
            <li key={b.product_id} className="flex items-center gap-2 py-2 text-sm">
              <span className="font-display font-bold text-leaf w-6">{i + 1}</span>
              <span className="flex-1 font-semibold truncate">{b.name}</span>
              <span className="text-ink-soft">
                {b.qty_sold} sold · ₹{b.revenue.toFixed(0)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl bg-leaf text-white p-4">
        <h2 className="font-display font-bold text-xl">Restock ticket</h2>
        <p className="text-xs text-white/75">
          Essentials only. Anything under a week of cover.
        </p>
        {restock.length === 0 ? (
          <p className="mt-2 text-sm text-white/80">
            Shelves are healthy. Nothing needs restocking right now.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {restock.map((r) => (
              <li
                key={r.product_id}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm"
              >
                <p className="font-semibold">
                  Restock {r.suggested_qty} × {r.name}
                </p>
                <p className="text-xs text-white/70">
                  {r.stock_quantity} left · {r.velocity_per_day}/day ·{" "}
                  {r.days_of_cover} days of cover. {r.reason}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-counter border border-line p-4 lg:col-span-2">
        <h2 className="font-display font-bold text-xl">Not moving</h2>
        <p className="text-xs text-ink-soft">
          Two or fewer units sold in 30 days. Skip these on the next wholesale
          run.
        </p>
        {skip.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            Everything moved this month.
          </p>
        ) : (
          <ul className="mt-2 grid sm:grid-cols-2 gap-2">
            {skip.map((s) => (
              <li
                key={s.product_id}
                className="rounded-xl border border-line px-3 py-2 text-sm flex justify-between gap-2"
              >
                <span className="font-semibold truncate">{s.name}</span>
                <span className="text-ink-soft shrink-0">
                  {s.qty_sold} sold · {s.stock_quantity} stuck
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
