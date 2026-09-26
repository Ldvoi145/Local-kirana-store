-- ============================================================
-- 002: vendors manage only shops they own (claim first, then manage)
-- Run once in the Supabase SQL editor. No data is changed.
-- After this, vendors must click "Claim this shop" (or add their own
-- shop) before orders, inventory, and insights open up for it.
-- ============================================================

drop policy if exists products_vendor_write on products;
create policy products_vendor_write on products
  for all
  using (exists (
    select 1 from shops s
    where s.id = products.shop_id
      and s.owner_id = auth.uid()))
  with check (exists (
    select 1 from shops s
    where s.id = products.shop_id
      and s.owner_id = auth.uid()));

-- shops_vendor_update is intentionally unchanged: it lets a vendor claim
-- an unclaimed shop (owner_id IS NULL -> owner_id = self) but nothing else.
-- orders policies are already owner-scoped; no change needed.
