import { notFound, redirect } from "next/navigation";
import { getShop, getSession } from "@/lib/dal";
import { getReorderCandidates } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";
import { AddButton } from "@/components/add-button";
import { StockStamp } from "@/components/stock-stamp";
import { ReorderRail } from "@/components/reorder-rail";
import { SuggestForm } from "@/components/suggest-form";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { id } = await params;
  const { user } = await getSession();
  // QR entry: scan -> shop -> login/signup -> back here. Logged-in
  // customers skip straight to the rate board.
  if (!user) redirect(`/login?next=${encodeURIComponent(`/shop/${id}`)}`);
  const data = await getShop(id);
  if (!data) notFound();
  const { shop, products, categories } = data;
  const { q, category } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const visible = products.filter((p) => {
    if (category && p.category !== category) return false;
    if (
      query &&
      !`${p.name} ${p.category}`.toLowerCase().includes(query)
    )
      return false;
    return true;
  });

  let reorder: Awaited<ReturnType<typeof getReorderCandidates>> = [];
  if (user) {
    const supabase = await createClient();
    reorder = await getReorderCandidates(supabase, user.id, id);
  }
  const supabase = await createClient();
  const { data: myRequests } = await supabase
    .from("suggestions")
    .select("id, item_name, status, created_at")
    .eq("shop_id", id)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-counter border border-line p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-3xl">{shop.name}</h1>
            <p className="text-sm text-ink-soft">
              {shop.address} · {shop.timings}
            </p>
            <p className="mt-1 text-sm">{shop.description}</p>
          </div>
          <span
            className={`shrink-0 rounded-full text-xs font-semibold px-2.5 py-0.5 border ${
              shop.is_open
                ? "bg-leaf/10 text-leaf border-leaf/30"
                : "bg-ink/5 text-ink-soft border-line"
            }`}
          >
            {shop.is_open ? "Open" : "Closed"}
          </span>
        </div>
        <form className="mt-4 flex flex-wrap gap-2" method="get">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={`Search inside ${shop.name}`}
            aria-label="Search inside this shop"
            className="flex-1 min-w-52 rounded-lg border border-line px-3 py-2 text-sm bg-ledger"
          />
          <select
            name="category"
            defaultValue={category ?? ""}
            aria-label="Filter by category"
            className="rounded-lg border border-line px-3 py-2 text-sm bg-ledger"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-leaf text-white text-sm font-semibold px-4 py-2 hover:bg-leaf-deep flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            Filter
          </button>
        </form>
      </section>

      {user && reorder.length > 0 && (
        <ReorderRail items={reorder.slice(0, 6)} shopName={shop.name} />
      )}

      <section className="rounded-2xl bg-counter border border-line overflow-hidden">
        <h2 className="font-display font-bold text-xl px-4 pt-4">
          Rate board · {visible.length} items
        </h2>
        {visible.length === 0 ? (
          <p className="p-8 text-center text-ink-soft text-sm">
            Nothing on the board matches. Clear the search to see everything.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-sm text-ink-soft">
                    {p.category} · ₹{Number(p.price).toFixed(2)} / {p.unit}
                  </p>
                </div>
                <StockStamp
                  stock={p.stock_quantity}
                  available={p.is_available}
                />
                <AddButton product={p} shopName={shop.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {user.id !== shop.owner_id && (
        <SuggestForm shopId={shop.id} shopName={shop.name} />
      )}
      {(myRequests ?? []).length > 0 && (
        <section className="rounded-2xl bg-counter border border-line p-5">
          <h2 className="font-display font-bold text-lg">Your requests</h2>
          <ul className="mt-2 space-y-2">
            {(myRequests ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
              >
                <span className="font-semibold flex-1">{r.item_name}</span>
                <span className="text-xs text-ink-soft">{r.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
