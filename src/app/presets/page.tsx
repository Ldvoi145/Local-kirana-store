import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { PresetList } from "@/components/preset-list";
import type { Preset, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PresetsPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/presets");
  const supabase = await createClient();
  const { data } = await supabase
    .from("presets")
    .select("*, shops(name), preset_items(*, products(*))")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

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
    <div className="space-y-4">
      <h1 className="font-display font-bold text-3xl">Your presets</h1>
      <p className="text-sm text-ink-soft">
        Named carts such as “Monthly ration”. Load one into the cart and check
        out in seconds.
      </p>
      <PresetList presets={presets} />
    </div>
  );
}
