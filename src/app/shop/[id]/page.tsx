import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getShop, getSession } from "@/lib/dal";
import { getReorderCandidates } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import { PresetAddCard } from "@/components/preset-add-card";
import { SelectedItemsBar } from "@/components/selected-items-bar";
import { ReorderRail } from "@/components/reorder-rail";
import { SuggestForm } from "@/components/suggest-form";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; category?: string; preset?: string }>;
}) {
  const { id } = await params;
  const { user } = await getSession();
  // QR entry: scan -> shop -> login/signup -> back here. Logged-in
  // customers skip straight to the rate board.
  if (!user) redirect(`/login?next=${encodeURIComponent(`/shop/${id}`)}`);
  const data = await getShop(id);
  if (!data) notFound();
  const { shop, products, categories } = data;
  const { q, category, preset: presetParam } = await searchParams;
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

  // Preset-building context: ?preset=<id> turns this inventory into an
  // "Add items" picker for one owned preset of THIS shop. Anything else
  // falls back to normal shopping mode.
  let activePreset: {
    id: string;
    name: string;
    quantities: Record<string, number>;
  } | null = null;
  if (presetParam) {
    const { data: prow } = await supabase
      .from("presets")
      .select("id, name, shop_id, preset_items(product_id, quantity)")
      .eq("id", presetParam)
      .eq("customer_id", user.id)
      .single();
    const typed = prow as unknown as {
      id: string;
      name: string;
      shop_id: string;
      preset_items: { product_id: string; quantity: number }[];
    } | null;
    if (typed && typed.shop_id === id) {
      activePreset = {
        id: typed.id,
        name: typed.name,
        quantities: Object.fromEntries(
          typed.preset_items.map((i) => [i.product_id, i.quantity]),
        ),
      };
    }
  }

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
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-1 border ${
              shop.is_open
                ? "bg-fresh/10 text-leaf-deep border-fresh/40"
                : "bg-ink/5 text-ink-soft border-line"
            }`}
          >
            <span
              aria-hidden
              className={`w-1.5 h-1.5 rounded-full ${shop.is_open ? "bg-fresh" : "bg-ink-soft"}`}
            />
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
        <div className="flex items-baseline justify-between px-4 pt-4">
          <h2 className="font-display font-bold text-xl tracking-tight">
            Shop inventory
          </h2>
          <p className="text-xs text-ink-soft tnum">{visible.length} items</p>
        </div>
        {activePreset && (
          <div className="mx-4 mt-2 rounded-xl border border-leaf/40 bg-leaf/5 px-4 py-2.5 text-sm flex flex-wrap items-center gap-2">
            <span>
              Adding to preset{" "}
              <span className="font-bold">{activePreset.name}</span>
            </span>
            <Link
              href={`/presets/${activePreset.id}`}
              className="ml-auto rounded-lg bg-leaf text-white text-xs font-bold px-3 py-1.5 hover:bg-leaf-deep"
            >
              Done — back to preset
            </Link>
          </div>
        )}
        {visible.length === 0 ? (
          <p className="p-8 text-center text-ink-soft text-sm">
            Nothing on the board matches. Clear the search to see everything.
          </p>
        ) : activePreset ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 p-4">
            {visible.map((p) => (
              <PresetAddCard
                key={p.id}
                product={p}
                presetId={activePreset.id}
                initialQty={activePreset.quantities[p.id] ?? 0}
              />
            ))}
          </ul>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 p-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} shopName={shop.name} />
            ))}
          </ul>
        )}
      </section>
      {!activePreset && <SelectedItemsBar shopId={shop.id} shopName={shop.name} />}

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
