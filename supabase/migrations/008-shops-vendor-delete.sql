-- ============================================================
-- 008: let vendors delete ONLY shops they own.
-- Run once in the Supabase SQL editor.
-- App + server already restrict removal to the owning vendor
-- (requireVendorShop); without this policy Postgres blocks even
-- the owner with an RLS violation. Other vendors' shops and
-- unclaimed shops are untouched: USING matches owner_id exactly.
-- Products, presets, and suggestions cascade from shops.
-- Orders RESTRICT the delete (see deleteShop guard).
-- ============================================================

drop policy if exists shops_vendor_delete on shops;
create policy shops_vendor_delete on shops
  for delete using (owner_id = auth.uid());
