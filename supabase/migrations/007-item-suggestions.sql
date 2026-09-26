-- ============================================================
-- 007: customer item requests (suggestions vendors receive).
-- Run once in the Supabase SQL editor.
-- Customers can only add/remove cart items and order; this table is
-- their one write path to the vendor: "please stock X".
-- Vendors see requests only for shops they own.
-- ============================================================

create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  customer_id uuid not null references profiles (id) on delete cascade,
  customer_name text not null default '',
  item_name text not null,
  note text not null default '',
  status text not null default 'Pending'
    check (status in ('Pending', 'Approved', 'Rejected', 'Added')),
  created_at timestamptz not null default now()
);
create index if not exists suggestions_shop_idx
  on suggestions (shop_id, created_at desc);
create index if not exists suggestions_customer_idx
  on suggestions (customer_id, created_at desc);

alter table suggestions enable row level security;

drop policy if exists suggestions_customer_insert on suggestions;
create policy suggestions_customer_insert on suggestions
  for insert with check (auth.uid() = customer_id);

drop policy if exists suggestions_customer_read on suggestions;
create policy suggestions_customer_read on suggestions
  for select using (auth.uid() = customer_id);

drop policy if exists suggestions_vendor_read on suggestions;
create policy suggestions_vendor_read on suggestions
  for select using (exists (
    select 1 from shops s
    where s.id = suggestions.shop_id
      and s.owner_id = auth.uid()));

drop policy if exists suggestions_vendor_update on suggestions;
create policy suggestions_vendor_update on suggestions
  for update using (exists (
    select 1 from shops s
    where s.id = suggestions.shop_id
      and s.owner_id = auth.uid()));
