import { redirect } from "next/navigation";
import { getSession, getShops } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { PresetsManager } from "@/components/presets-manager";
import type { Preset, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PresetsPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/presets");
  const supabase = await createClient();
  const { create: createShopId } = await searchParams;

  const [{ data }, shops] = await Promise.all([
    supabase
      .from("presets")
      .select("*, shops(name), preset_items(*, products(*))")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false }),
    getShops(),
  ]);

  const presets: Preset[] = (data ?? []).map((row) => {
    const p = row as unknown as {
      id: string;
      customer_id: string;
      shop_id: string;
      name: string;
      shops: { name: string } | null;
      preset_items: {
        preset_id: string;
        product_id: string;
        quantity: number;
        products: Product | null;
      }[];
    };
    return {
      id: p.id,
      customer_id: p.customer_id,
      shop_id: p.shop_id,
      name: p.name,
      shop_name: p.shops?.name,
      items: p.preset_items.map((i) => ({
        preset_id: i.preset_id,
        product_id: i.product_id,
        quantity: i.quantity,
        product: i.products ?? undefined,
      })),
    };
  });

  return (
    <PresetsManager
      presets={presets}
      shops={shops.map((s) => ({
        id: s.id,
        name: s.name,
        product_count: s.product_count ?? 0,
      }))}
      initialCreateShopId={createShopId ?? null}
    />
  );
}
