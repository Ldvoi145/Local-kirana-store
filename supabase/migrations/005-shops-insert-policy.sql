-- ============================================================
-- 005: ensure vendors can insert their own shops (idempotent).
-- Run once in the Supabase SQL editor if Add Shop shows an
-- RLS / "new row violates row-level security" error.
-- No data is changed.
-- ============================================================

drop policy if exists shops_vendor_insert on shops;
create policy shops_vendor_insert on shops
  for insert with check (auth.uid() = owner_id);
