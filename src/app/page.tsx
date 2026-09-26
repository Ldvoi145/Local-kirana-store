import Link from "next/link";
import { getSession, getShops, searchProducts } from "@/lib/dal";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const { user, profile } = await getSession();
  const firstName =
    profile?.name?.trim().split(/\s+/)[0] ??
    user?.email?.split("@")[0] ??
    null;

  const shops = await getShops();
  const openNow = shops.filter((s) => s.is_open).length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-leaf-deep text-white px-5 py-5 sm:px-6 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
            <h1 className="font-display font-bold text-2xl sm:text-[28px] leading-snug tracking-tight">
              {firstName ? `Welcome back, ${firstName}.` : "Tonight's dinner starts at the shop next door."}
            </h1>
            <p className="mt-1 text-white/75 text-sm">
              {firstName
                ? "Your shops are stocked and your presets are one tap away."
                : "Check live stock at neighbourhood kiranas, order for pickup or home delivery, and reorder staples in one tap."}
            </p>
          </div>
          {shops.length > 0 && (
            <dl className="flex gap-2 text-center" aria-label="Shop availability">
              <div className="rounded-xl bg-white/10 px-3 py-1.5">
                <dt className="sr-only">Shops</dt>
                <dd className="font-display font-bold text-lg leading-none tnum">{shops.length}</dd>
                <dd className="text-white/65 text-xs">shops</dd>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-1.5">
                <dt className="sr-only">Open now</dt>
                <dd className="font-display font-bold text-lg leading-none tnum">{openNow}</dd>
                <dd className="text-white/65 text-xs">open now</dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {query ? (
        <SearchResults query={query} shops={shops} loggedIn={!!user} />
      ) : (
        <ShopList shops={shops} />
      )}
    </div>
  );
}

type ShopSummary = Awaited<ReturnType<typeof getShops>>[number];

function ShopList({ shops }: { shops: ShopSummary[] }) {
  if (shops.length === 0)
    return (
      <EmptyState
        title="No shops yet"
        text="Vendors add their first store from the Vendor page, and it will appear here."
      />
    );
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display font-bold text-xl tracking-tight">Nearby shops</h2>
        <p className="text-xs text-ink-soft tnum">{shops.length} nearby</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {shops.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl bg-counter border border-line p-5 lift flex flex-col"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display font-bold text-lg leading-snug tracking-tight truncate">{s.name}</h3>
                <p className="mt-0.5 text-[13px] text-ink-soft truncate">{s.address}</p>
                <p className="text-[13px] text-ink-soft">{s.timings}</p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-1 border ${
                  s.is_open
                    ? "bg-fresh/10 text-leaf-deep border-fresh/40"
                    : "bg-ink/5 text-ink-soft border-line"
                }`}
              >
                <span
                  aria-hidden
                  className={`w-1.5 h-1.5 rounded-full ${s.is_open ? "bg-fresh" : "bg-ink-soft"}`}
                />
                {s.is_open ? "Open" : "Closed"}
              </span>
            </div>
            {s.description && (
              <p className="mt-2 text-sm text-ink-soft line-clamp-2">{s.description}</p>
            )}
            <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-2">
              <span className="text-[13px] text-ink-soft tnum">
                {s.product_count} items
              </span>
              <Link
                href={`/shop/${s.id}`}
                className="rounded-lg bg-leaf text-white text-sm font-semibold px-4 py-2 hover:bg-leaf-deep active:bg-leaf-deep"
              >
                Shop inventory →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function SearchResults({ query, shops, loggedIn }: { query: string; shops: ShopSummary[]; loggedIn: boolean }) {
  const results = await searchProducts(query);
  const q = query.toLowerCase();
  const matchingShops = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.address ?? "").toLowerCase().includes(q),
  );
  return (
    <section className="space-y-4">
      {matchingShops.length > 0 && (
        <div className="rounded-2xl bg-counter border border-line p-4">
          <h2 className="font-display font-bold text-lg tracking-tight">
            Shops matching “{query}”
          </h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {matchingShops.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/shop/${s.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 hover:bg-ledger"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold truncate">{s.name}</span>
                    <span className="block text-xs text-ink-soft truncate">{s.address}</span>
                  </span>
                  <span aria-hidden className="text-leaf font-bold">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h2 className="font-display font-bold text-xl tracking-tight">
        {results.length} item{results.length === 1 ? "" : "s"} for “{query}”
      </h2>
      {results.length === 0 ? (
        <EmptyState
          title="No matches"
          text="Nothing on any neighbourhood board matches that. Try atta, milk, or soap."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              shopName={p.shop_name ?? ""}
              loggedIn={loggedIn}
              nextPath="/"
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-counter border border-dashed border-line p-8 text-center">
      <p className="font-display font-bold text-lg">{title}</p>
      <p className="mt-1 text-sm text-ink-soft max-w-md mx-auto">{text}</p>
    </div>
  );
}
