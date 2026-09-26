"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CartLine } from "@/lib/types";

async function requireVendor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "vendor")
    throw new Error("A shopkeeper account is required.");
  return { supabase, user };
}

async function requireVendorShop(shopId: string) {
  const { supabase, user } = await requireVendor();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, owner_id")
    .eq("id", shopId)
    .single();
  if (!shop) throw new Error("Shop not found.");
  if (shop.owner_id !== user.id)
    throw new Error("This is not your store. Claim it first.");
  return { supabase, user };
}

export async function createShopState(
  _prev: string | null,
  formData: FormData,
): Promise<string> {
  try {
    await createShop(formData);
    return "created";
  } catch (e) {
    return e instanceof Error ? e.message : "Could not add shop.";
  }
}

export async function claimShopState(
  shopId: string,
  _prev: string | null,
): Promise<string> {
  void _prev;
  try {
    await claimShop(shopId);
    return "claimed";
  } catch (e) {
    return e instanceof Error ? e.message : "Could not claim shop.";
  }
}
export async function createShop(formData: FormData) {
  const { supabase, user } = await requireVendor();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (name.length < 2) throw new Error("Give the shop a name.");
  const { data, error } = await supabase
    .from("shops")
    .insert({
      owner_id: user.id,
      name,
      address: String(formData.get("address") ?? "").trim() || null,
      timings:
        String(formData.get("timings") ?? "").trim() || "7:00 AM - 9:30 PM",
      is_open: true,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not add shop.");
  revalidatePath("/vendor");
  revalidatePath("/", "layout");
}

export async function checkout(
  lines: CartLine[],
  orderType: "Pickup" | "Delivery",
  address: string,
  payment: string,
): Promise<string> {
  if (lines.length === 0) throw new Error("Your cart is empty.");
  const shopId = lines[0].shop_id;
  if (!lines.every((l) => l.shop_id === shopId))
    throw new Error("All items must come from one shop.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in to place an order.");

  const { data, error } = await supabase.rpc("place_order", {
    p_shop_id: shopId,
    p_items: lines.map((l) => ({
      product_id: l.product_id,
      quantity: l.quantity,
    })),
    p_type: orderType,
    p_address: address.trim(),
    p_payment: payment,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return data as string;
}

export async function updateOrderStatus(
  orderId: string,
  shopId: string,
  formData: FormData,
) {
  const { supabase } = await requireVendorShop(shopId);
  const status = String(formData.get("status") ?? "");
  if (!["Pending", "Preparing", "Ready", "Completed", "Cancelled"].includes(status))
    throw new Error("Invalid status.");
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("shop_id", shopId);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor");
}

export async function claimShop(shopId: string) {
  const { supabase, user } = await requireVendor();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, owner_id")
    .eq("id", shopId)
    .single();
  if (!shop) throw new Error("Shop not found.");
  if (shop.owner_id !== null) throw new Error("Already claimed.");
  const { error } = await supabase
    .from("shops")
    .update({ owner_id: user.id })
    .eq("id", shopId)
    .is("owner_id", null);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor");
}

export async function toggleShopOpen(shopId: string, isOpen: boolean) {
  const { supabase } = await requireVendorShop(shopId);
  const { error } = await supabase
    .from("shops")
    .update({ is_open: isOpen })
    .eq("id", shopId);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor");
}

export async function addProduct(shopId: string, formData: FormData) {
  const { supabase } = await requireVendorShop(shopId);
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price"));
  if (!name || !(price > 0)) throw new Error("Invalid product details.");
  const { error } = await supabase.from("products").insert({
    shop_id: shopId,
    name,
    category: String(formData.get("category") ?? "Essentials").trim() || "Essentials",
    price,
    unit: String(formData.get("unit") ?? "1 pc").trim() || "1 pc",
    stock_quantity: Number(formData.get("stock_quantity") ?? 10),
    is_available: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/vendor");
  revalidatePath("/", "layout");
}

export async function addProductState(
  shopId: string,
  _prev: string | null,
  formData: FormData,
): Promise<string> {
  try {
    await addProduct(shopId, formData);
    return "added";
  } catch (e) {
    return e instanceof Error ? e.message : "Could not add product.";
  }
}

export async function updateProduct(
  shopId: string,
  productId: string,
  formData: FormData,
) {
  const { supabase } = await requireVendorShop(shopId);
  const stock = Number(formData.get("stock_quantity") ?? 0);
  const { error } = await supabase
    .from("products")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      category: String(formData.get("category") ?? "Essentials").trim(),
      price: Number(formData.get("price")),
      unit: String(formData.get("unit") ?? "1 pc").trim(),
      stock_quantity: stock,
      is_available: formData.get("is_available") === "on" && stock > 0,
    })
    .eq("id", productId)
    .eq("shop_id", shopId);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor");
}

export async function deleteProduct(shopId: string, productId: string) {
  const { supabase } = await requireVendorShop(shopId);
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("shop_id", shopId);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor");
}

export async function savePreset(shopId: string, name: string, lines: CartLine[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in to save presets.");
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new Error("Give the preset a name.");
  const { data: preset, error } = await supabase
    .from("presets")
    .upsert(
      { customer_id: user.id, shop_id: shopId, name: clean },
      { onConflict: "customer_id,shop_id,name" },
    )
    .select("id")
    .single();
  if (error || !preset) throw new Error(error?.message ?? "Could not save preset.");
  await supabase.from("preset_items").delete().eq("preset_id", preset.id);
  const { error: itemsError } = await supabase.from("preset_items").insert(
    lines.map((l) => ({
      preset_id: preset.id,
      product_id: l.product_id,
      quantity: l.quantity,
    })),
  );
  if (itemsError) throw new Error(itemsError.message);
  revalidatePath("/presets");
}

export async function deletePreset(presetId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("presets").delete().eq("id", presetId);
  if (error) throw new Error(error.message);
  revalidatePath("/presets");
}
