import { createClient } from "@/lib/supabase/server";
import type { Order, OrderItem, Product, Profile, Shop } from "@/lib/types";

/** True once .env.local carries Supabase credentials. */
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function getSession() {
  if (!isSupabaseConfigured())
    return { supabase: null, user: null, profile: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  return { supabase, user, profile };
}

export async function getShops(): Promise<Shop[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data: shops } = await supabase
    .from("shops")
    .select("*, products(count)")
    .order("name");
  return (shops ?? []).map((s) => ({
    ...s,
    product_count: s.products?.[0]?.count ?? 0,
  }));
}

export async function getShop(id: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("id", id)
    .single<Shop>();
  if (!shop) return null;
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", id)
    .order("is_available", { ascending: false })
    .order("category")
    .order("name");
  const categories = [...new Set((products ?? []).map((p) => p.category))];
  return { shop, products: (products ?? []) as Product[], categories };
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, shops!inner(name)")
    .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
    .order("is_available", { ascending: false })
    .order("name")
    .limit(60);
  return (data ?? []).map((p) => ({
    ...(p as unknown as Product),
    shop_name: (p as unknown as { shops: { name: string } }).shops?.name,
  }));
}

export async function getOrderWithItems(orderId: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, shops(name)")
    .eq("id", orderId)
    .single();
  if (!order) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  return {
    order: {
      ...(order as unknown as Order),
      shop_name: (order as unknown as { shops: { name: string } }).shops?.name,
    },
    items: (items ?? []) as OrderItem[],
  };
}
