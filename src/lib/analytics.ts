import type { SupabaseClient } from "@supabase/supabase-js";

export interface Bestseller {
  product_id: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
  qty_sold: number;
  revenue: number;
}

export interface SlowMover {
  product_id: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
  qty_sold: number;
}

export interface RestockSuggestion {
  product_id: string;
  name: string;
  stock_quantity: number;
  velocity_per_day: number;
  days_of_cover: number;
  suggested_qty: number;
  reason: string;
}

export interface ReorderCandidate {
  product_id: string;
  name: string;
  price: number;
  unit: string;
  shop_id: string;
  times_ordered: number;
  total_qty: number;
  last_ordered_at: string;
  avg_interval_days: number | null;
  due: boolean;
}

const DAY_MS = 86_400_000;

function daysSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / DAY_MS;
}

/** Rank products by quantity sold and revenue inside a window. */
export async function getBestsellers(
  supabase: SupabaseClient,
  shopId: string,
  days: number | null,
): Promise<Bestseller[]> {
  const since =
    days === null ? null : new Date(Date.now() - days * DAY_MS).toISOString();
  let ordersQuery = supabase
    .from("orders")
    .select("id")
    .eq("shop_id", shopId)
    .neq("status", "Cancelled");
  if (since) ordersQuery = ordersQuery.gte("created_at", since);
  const { data: orders } = await ordersQuery;
  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) return [];

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, name, quantity, subtotal, products!inner(category, price, stock_quantity)")
    .in("order_id", orderIds);
  const byProduct = new Map<string, Bestseller>();
  for (const row of items ?? []) {
    const p = row as unknown as {
      product_id: string;
      name: string;
      quantity: number;
      subtotal: number;
      products: { category: string; price: number; stock_quantity: number };
    };
    const cur = byProduct.get(row.product_id) ?? {
      product_id: row.product_id,
      name: row.name,
      category: p.products.category,
      price: Number(p.products.price),
      stock_quantity: p.products.stock_quantity,
      qty_sold: 0,
      revenue: 0,
    };
    cur.qty_sold += row.quantity;
    cur.revenue += Number(row.subtotal);
    byProduct.set(row.product_id, cur);
  }
  return [...byProduct.values()].sort((a, b) => b.qty_sold - a.qty_sold);
}

/** Products with little or no movement inside a window. */
export async function getSlowMovers(
  supabase: SupabaseClient,
  shopId: string,
  days: number,
  limitQty = 2,
): Promise<SlowMover[]> {
  const sold = await getBestsellers(supabase, shopId, days);
  const soldQty = new Map(sold.map((s) => [s.product_id, s.qty_sold]));
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, price, stock_quantity")
    .eq("shop_id", shopId)
    .order("name");
  return (products ?? [])
    .map((p) => ({
      product_id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      stock_quantity: p.stock_quantity,
      qty_sold: soldQty.get(p.id) ?? 0,
    }))
    .filter((p) => p.qty_sold <= limitQty)
    .sort((a, b) => a.qty_sold - b.qty_sold);
}

/**
 * Restock only essentials. Velocity is units sold per day over the window;
 * days of cover is current stock divided by velocity. Anything under a week
 * of cover earns a suggested top-up to 21 days of stock.
 */
export async function getRestockSuggestions(
  supabase: SupabaseClient,
  shopId: string,
  days = 30,
): Promise<{ restock: RestockSuggestion[]; skip: SlowMover[] }> {
  const sold = await getBestsellers(supabase, shopId, days);
  const restock = sold
    .map((s) => {
      const velocity = s.qty_sold / days;
      const cover = velocity > 0 ? s.stock_quantity / velocity : Infinity;
      return { s, velocity, cover };
    })
    .filter(({ cover }) => cover < 7)
    .map(({ s, velocity, cover }) => ({
      product_id: s.product_id,
      name: s.name,
      stock_quantity: s.stock_quantity,
      velocity_per_day: Math.round(velocity * 100) / 100,
      days_of_cover: Math.round(cover * 10) / 10,
      suggested_qty: Math.max(1, Math.ceil(velocity * 21 - s.stock_quantity)),
      reason:
        cover < 1
          ? "Selling faster than cover. Restock first."
          : "Under a week of cover left.",
    }))
    .sort((a, b) => a.days_of_cover - b.days_of_cover);
  const skip = await getSlowMovers(supabase, shopId, days);
  return { restock, skip };
}

/** Personal reorder signals from a customer's own order history. */
export async function getReorderCandidates(
  supabase: SupabaseClient,
  customerId: string,
  shopId: string,
): Promise<ReorderCandidate[]> {
  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at")
    .eq("customer_id", customerId)
    .eq("shop_id", shopId)
    .neq("status", "Cancelled")
    .order("created_at", { ascending: false })
    .limit(50);
  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) return [];
  const orderDates = new Map((orders ?? []).map((o) => [o.id, o.created_at]));

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity, order_id, products!inner(name, price, unit)")
    .in("order_id", orderIds);
  const byProduct = new Map<
    string,
    { dates: string[]; total_qty: number; meta: { name: string; price: number; unit: string } }
  >();
  for (const row of items ?? []) {
    const r = row as unknown as {
      product_id: string;
      quantity: number;
      order_id: string;
      products: { name: string; price: number; unit: string };
    };
    const cur = byProduct.get(row.product_id) ?? {
      dates: [],
      total_qty: 0,
      meta: {
        name: r.products.name,
        price: Number(r.products.price),
        unit: r.products.unit,
      },
    };
    cur.dates.push(orderDates.get(row.order_id)!);
    cur.total_qty += row.quantity;
    byProduct.set(row.product_id, cur);
  }
  return [...byProduct.entries()]
    .map(([product_id, v]) => {
      const sorted = v.dates.sort();
      const last = sorted[sorted.length - 1];
      let avg: number | null = null;
      if (sorted.length > 1) {
        const span =
          (new Date(sorted[sorted.length - 1]).getTime() -
            new Date(sorted[0]).getTime()) /
          DAY_MS;
        avg = span / (sorted.length - 1);
      }
      return {
        product_id,
        name: v.meta.name,
        price: v.meta.price,
        unit: v.meta.unit,
        shop_id: shopId,
        times_ordered: sorted.length,
        total_qty: v.total_qty,
        last_ordered_at: last,
        avg_interval_days: avg === null ? null : Math.round(avg * 10) / 10,
        due: avg !== null && daysSince(last) >= avg * 0.8,
      };
    })
    .sort((a, b) => b.times_ordered - a.times_ordered);
}

/** Items frequently bought in the same order as the given product. */
export async function getPairsWellWith(
  supabase: SupabaseClient,
  shopId: string,
  productId: string,
  limit = 4,
): Promise<{ product_id: string; name: string; together: number }[]> {
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_items(product_id, name)")
    .eq("shop_id", shopId)
    .neq("status", "Cancelled")
    .order("created_at", { ascending: false })
    .limit(100);
  const counts = new Map<string, { name: string; together: number }>();
  for (const o of orders ?? []) {
    const lines = (
      o as unknown as {
        order_items: { product_id: string; name: string }[];
      }
    ).order_items;
    if (!lines.some((l) => l.product_id === productId)) continue;
    for (const l of lines) {
      if (l.product_id === productId) continue;
      const cur = counts.get(l.product_id) ?? { name: l.name, together: 0 };
      cur.together += 1;
      counts.set(l.product_id, cur);
    }
  }
  return [...counts.entries()]
    .map(([product_id, v]) => ({ product_id, ...v }))
    .sort((a, b) => b.together - a.together)
    .slice(0, limit);
}
