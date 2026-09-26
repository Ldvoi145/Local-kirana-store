import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { PresetDetail } from "@/components/preset-detail";
import type { Preset, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PresetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/presets/${id}`)}`);
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("presets")
    .select("*, shops(name), preset_items(*, products(*))")
    .eq("id", id)
    .eq("customer_id", user.id)
    .single();
  if (!row) notFound();

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
  const preset: Preset = {
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

  return <PresetDetail preset={preset} />;
}
