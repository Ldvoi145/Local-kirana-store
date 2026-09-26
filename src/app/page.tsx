import Link from "next/link";
import { getShops, searchProducts } from "@/lib/dal";
import { AddButton } from "@/components/add-button";
import { StockStamp } from "@/components/stock-stamp";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-leaf text-white p-6 sm:p-8">
        <h1 className="font-display font-bold text-3xl sm:text-4xl leading-tight">
          Tonight&apos;s dinner starts at the shop next door.
        </h1>
        <p className="mt-2 text-white/80 max-w-2xl">
          Check live stock at neighbourhood kiranas, order for pickup or
          home delivery, and reorder staples in one tap.
        </p>
      </section>

      {query ? (
        <SearchResults query={query} />
      ) : (
        <ShopList />
      )}
    </div>
  );
}

async function ShopList() {
  const shops = await getShops();
  if (shops.length === 0)
    return <EmptyState text="No shops yet. Run supabase/schema.sql to seed the demo stores." />;
  return (
    <section className="space-y-3">
      <h2 className="font-display font-bold text-2xl">Nearby shops</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {shops.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl bg-counter border border-line p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-xl">{s.name}</h3>
                <p className="text-sm text-ink-soft">{s.address}</p>
                <p className="text-sm text-ink-soft">{s.timings}</p>
              </div>
              <span
                className={`rounded-full text-xs font-semibold px-2.5 py-0.5 border ${
                  s.is_open
                    ? "bg-leaf/10 text-leaf border-leaf/30"
                    : "bg-ink/5 text-ink-soft border-line"
                }`}
              >
                {s.is_open ? "Open" : "Closed"}
              </span>
            </div>
            <p className="mt-2 text-sm">{s.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-ink-soft">
                {s.product_count} items on the board
              </span>
              <Link
                href={`/shop/${s.id}`}
                className="rounded-lg bg-marigold text-ink text-sm font-semibold px-4 py-2 hover:brightness-95"
              >
                Open rate board
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function SearchResults({ query }: { query: string }) {
  const results = await searchProducts(query);
  return (
    <section className="space-y-3">
      <h2 className="font-display font-bold text-2xl">
        {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
      </h2>
      {results.length === 0 ? (
        <EmptyState text="Nothing on any neighbourhood board matches that. Try atta, milk, or soap." />
      ) : (
        <ul className="divide-y divide-line rounded-2xl bg-counter border border-line overflow-hidden">
          {results.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-sm text-ink-soft">
                  {p.shop_name} · ₹{Number(p.price).toFixed(2)} / {p.unit}
                </p>
              </div>
              <StockStamp
                stock={p.stock_quantity}
                available={p.is_available}
              />
              <AddButton product={p} shopName={p.shop_name ?? ""} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-counter border border-line p-8 text-center text-ink-soft">
      {text}
    </div>
  );
}
