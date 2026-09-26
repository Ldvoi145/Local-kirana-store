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
    p_payment: ["Cash on Delivery", "UPI", "Card"].includes(payment)
      ? payment
      : "Cash on Delivery",
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
  const { supabase, user } = await requireVendorShop(shopId);
  const status = String(formData.get("status") ?? "");
  if (!["Pending", "Preparing", "Ready", "Completed", "Cancelled"].includes(status))
    throw new Error("Invalid status.");
  const { data: current } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("shop_id", shopId)
    .single();
  if (!current) throw new Error("Order not found.");
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("shop_id", shopId);
  if (error) throw new Error(error.message);
  if (current.status !== status) {
    await supabase.from("order_events").insert({
      order_id: orderId,
      from_status: current.status,
      to_status: status,
      changed_by: user.id,
    });
  }
  revalidatePath("/vendor");
  revalidatePath("/orders");
  revalidatePath(`/order/${orderId}`);
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

/** Remove a vendor-owned store. Blocked while order history exists. */
export async function deleteShop(shopId: string) {
  const { supabase } = await requireVendorShop(shopId);
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);
  if ((count ?? 0) > 0)
    throw new Error(
      "This store has order history, so it cannot be removed. Mark it closed instead.",
    );
  const { error } = await supabase.from("shops").delete().eq("id", shopId);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor");
  revalidatePath("/", "layout");
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

export async function suggestItem(shopId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in to send a suggestion.");
  const itemName = String(formData.get("item_name") ?? "").trim().slice(0, 80);
  if (itemName.length < 2) throw new Error("Name the item you want.");
  const note = String(formData.get("note") ?? "").trim().slice(0, 240);
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();
  const { error } = await supabase.from("suggestions").insert({
    shop_id: shopId,
    customer_id: user.id,
    customer_name:
      (profile as unknown as { name: string | null } | null)?.name?.trim() ||
      "Neighbour",
    item_name: itemName,
    note,
    status: "Pending",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/shop/${shopId}`);
  revalidatePath("/vendor");
}

export async function suggestItemState(
  shopId: string,
  _prev: string | null,
  formData: FormData,
): Promise<string> {
  try {
    await suggestItem(shopId, formData);
    return "sent";
  } catch (e) {
    return e instanceof Error ? e.message : "Could not send suggestion.";
  }
}

export async function updateSuggestionStatus(
  shopId: string,
  suggestionId: string,
  formData: FormData,
) {
  const { supabase } = await requireVendorShop(shopId);
  const status = String(formData.get("status") ?? "");
  if (!["Pending", "Approved", "Rejected", "Added"].includes(status))
    throw new Error("Invalid status.");
  const { error } = await supabase
    .from("suggestions")
    .update({ status })
    .eq("id", suggestionId)
    .eq("shop_id", shopId);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor");
}

async function requireCustomer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in to use presets.");
  return { supabase, user };
}

async function requireOwnedPreset(presetId: string) {
  const { supabase, user } = await requireCustomer();
  const { data: preset } = await supabase
    .from("presets")
    .select("id, shop_id, customer_id, name")
    .eq("id", presetId)
    .single();
  if (!preset || preset.customer_id !== user.id)
    throw new Error("Preset not found.");
  return { supabase, user, preset };
}

/**
 * Authoritative preset creation: Presets tab → + → shop → name → Create.
 * Creates an EMPTY preset; items are added afterwards via Add Items.
 */
export async function createPreset(
  shopId: string,
  name: string,
): Promise<string> {
  const { supabase, user } = await requireCustomer();
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new Error("Give the preset a name.");
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .single();
  if (!shop) throw new Error("Shop not found.");
  const { data: existing } = await supabase
    .from("presets")
    .select("id")
    .eq("customer_id", user.id)
    .eq("shop_id", shopId)
    .eq("name", clean)
    .maybeSingle();
  if (existing)
    throw new Error("You already have a preset with this name for this shop.");
  const { data: preset, error } = await supabase
    .from("presets")
    .insert({ customer_id: user.id, shop_id: shopId, name: clean })
    .select("id")
    .single();
  if (error || !preset)
    throw new Error(error?.message ?? "Could not create preset.");
  revalidatePath("/presets");
  return preset.id as string;
}

export async function renamePreset(presetId: string, name: string) {
  const { supabase } = await requireOwnedPreset(presetId);
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new Error("Give the preset a name.");
  const { error } = await supabase
    .from("presets")
    .update({ name: clean })
    .eq("id", presetId);
  if (error) throw new Error(error.message);
  revalidatePath("/presets");
  revalidatePath(`/presets/${presetId}`);
}

export async function deletePreset(presetId: string) {
  await requireOwnedPreset(presetId);
  const supabase = await createClient();
  const { error } = await supabase.from("presets").delete().eq("id", presetId);
  if (error) throw new Error(error.message);
  revalidatePath("/presets");
}

async function addItemToPreset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  presetId: string,
  productId: string,
  quantity: number,
) {
  const { data: row } = await supabase
    .from("preset_items")
    .select("quantity")
    .eq("preset_id", presetId)
    .eq("product_id", productId)
    .maybeSingle();
  const { error } = await supabase.from("preset_items").upsert(
    {
      preset_id: presetId,
      product_id: productId,
      quantity: (row?.quantity ?? 0) + quantity,
    },
    { onConflict: "preset_id,product_id" },
  );
  if (error) throw new Error(error.message);
}

/** Append a quantity to one product inside an owned preset (same shop only). */
export async function appendProductToPreset(
  presetId: string,
  shopId: string,
  productId: string,
  quantity: number,
) {
  const { supabase, preset } = await requireOwnedPreset(presetId);
  if (preset.shop_id !== shopId) throw new Error("Preset not found.");
  const qty = Math.max(1, Math.floor(quantity));
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("shop_id", shopId)
    .single();
  if (!product) throw new Error("Product not found in this shop.");
  await addItemToPreset(supabase, presetId, productId, qty);
  revalidatePath("/presets");
  revalidatePath(`/presets/${presetId}`);
}

/** Set an absolute quantity inside an owned preset; qty <= 0 removes the row. */
export async function setPresetItemQty(
  presetId: string,
  productId: string,
  quantity: number,
) {
  const { supabase, preset } = await requireOwnedPreset(presetId);
  const qty = Math.floor(quantity);
  if (qty <= 0) {
    const { error } = await supabase
      .from("preset_items")
      .delete()
      .eq("preset_id", presetId)
      .eq("product_id", productId);
    if (error) throw new Error(error.message);
  } else {
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("shop_id", preset.shop_id)
      .single();
    if (!product) throw new Error("Product not found in this shop.");
    const { error } = await supabase.from("preset_items").upsert(
      { preset_id: presetId, product_id: productId, quantity: qty },
      { onConflict: "preset_id,product_id" },
    );
    if (error) throw new Error(error.message);
  }
  revalidatePath("/presets");
  revalidatePath(`/presets/${presetId}`);
}

export async function removePresetItem(presetId: string, productId: string) {
  await setPresetItemQty(presetId, productId, 0);
}

export interface PresetOrderLine {
  product_id: string;
  name: string;
  price: number;
  unit: string;
  shop_id: string;
  shop_name: string;
  quantity: number;
}

export interface PresetOrderPreview {
  shopId: string;
  shopName: string;
  lines: PresetOrderLine[];
  unavailable: string[];
  adjusted: { name: string; wanted: number; added: number }[];
  total: number;
}

/**
 * Verify a preset against LIVE stock and return exactly what should enter
 * the cart. Never silently drops items: everything missing, closed, or
 * out of stock is named in `unavailable`, short stock in `adjusted`.
 */
export async function getPresetOrderPreview(
  presetId: string,
): Promise<PresetOrderPreview> {
  const { supabase } = await requireOwnedPreset(presetId);
  const { data: preset } = await supabase
    .from("presets")
    .select("id, shop_id, shops(name)")
    .eq("id", presetId)
    .single();
  if (!preset) throw new Error("Preset not found.");
  const shopName =
    (preset as unknown as { shops: { name: string } | null }).shops?.name ?? "";
  const { data: items } = await supabase
    .from("preset_items")
    .select("product_id, quantity, products(id, name, price, unit, stock_quantity, is_available, shop_id)")
    .eq("preset_id", presetId);
  const lines: PresetOrderLine[] = [];
  const unavailable: string[] = [];
  const adjusted: { name: string; wanted: number; added: number }[] = [];
  for (const row of (items ?? []) as unknown as {
    product_id: string;
    quantity: number;
    products: {
      id: string;
      name: string;
      price: number | string;
      unit: string;
      stock_quantity: number;
      is_available: boolean;
      shop_id: string;
    } | null;
  }[]) {
    const p = row.products;
    if (!p || p.shop_id !== preset.shop_id) {
      unavailable.push("An item that left this shop's catalogue");
      continue;
    }
    if (!p.is_available || p.stock_quantity <= 0) {
      unavailable.push(p.name);
      continue;
    }
    const wanted = Math.max(1, Math.floor(row.quantity));
    const addable = Math.min(wanted, p.stock_quantity);
    lines.push({
      product_id: p.id,
      name: p.name,
      price: Number(p.price),
      unit: p.unit,
      shop_id: preset.shop_id,
      shop_name: shopName,
      quantity: addable,
    });
    if (addable < wanted) adjusted.push({ name: p.name, wanted, added: addable });
  }
  return {
    shopId: preset.shop_id,
    shopName,
    lines,
    unavailable,
    adjusted,
    total: lines.reduce((n, l) => n + l.price * l.quantity, 0),
  };
}
