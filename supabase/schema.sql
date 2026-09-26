-- ============================================================
-- Kirana eStore — Supabase schema (Postgres + RLS)
-- Run once in the Supabase SQL editor, then seed demo shops.
-- ============================================================

-- ---------- Enums ----------
do $$ begin
  create type user_role as enum ('customer', 'vendor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_type as enum ('Pickup', 'Delivery');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'customer',
  name text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles (id) on delete set null,
  name text not null,
  address text,
  timings text not null default '7:00 AM - 9:30 PM',
  description text,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  name text not null,
  category text not null default 'Essentials',
  price numeric(10, 2) not null check (price > 0),
  unit text not null default '1 pc',
  stock_quantity integer not null default 10 check (stock_quantity >= 0),
  is_available boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists products_shop_idx on products (shop_id);
create index if not exists products_name_idx on products using gin (to_tsvector('english', name));

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete restrict,
  customer_id uuid not null references profiles (id) on delete cascade,
  type order_type not null default 'Pickup',
  payment_method text not null default 'Cash on Delivery',
  total_amount numeric(10, 2) not null default 0,
  status order_status not null default 'Pending',
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_address text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists orders_shop_idx on orders (shop_id, created_at desc);
create index if not exists orders_customer_idx on orders (customer_id, created_at desc);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  name text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  subtotal numeric(10, 2) not null
);
create index if not exists order_items_order_idx on order_items (order_id);

create table if not exists presets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  shop_id uuid not null references shops (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (customer_id, shop_id, name)
);

create table if not exists preset_items (
  preset_id uuid not null references presets (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  primary key (preset_id, product_id)
);

-- ---------- Auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role user_role := 'customer';
begin
  if (new.raw_user_meta_data ->> 'role') = 'vendor' then
    v_role := 'vendor';
  end if;
  insert into public.profiles (id, role, name, phone)
  values (new.id, v_role,
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Checkout transaction (single-shop enforced) ----------
-- p_items: [{"product_id": "uuid", "quantity": 2}]
create or replace function public.place_order(
  p_shop_id uuid,
  p_items jsonb,
  p_type text,
  p_address text,
  p_payment text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order_id uuid;
  v_total numeric(10, 2) := 0;
  v_name text;
  v_phone text;
  item jsonb;
  v_pid uuid;
  v_qty int;
  v_price numeric(10, 2);
  v_stock int;
  v_avail boolean;
  v_pshop uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;
  if p_type not in ('Pickup', 'Delivery') then
    raise exception 'Invalid order type';
  end if;

  select name, phone into v_name, v_phone from profiles where id = v_uid;
  if v_name is null or v_name = '' then v_name := 'Neighbour'; end if;

  -- Validate every line against live stock, locking rows. Prices come
  -- from the database, never from the client.
  for item in select * from jsonb_array_elements(p_items) loop
    v_pid := (item ->> 'product_id')::uuid;
    v_qty := (item ->> 'quantity')::int;
    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity for item %', v_pid;
    end if;
    select price, stock_quantity, is_available, shop_id
      into v_price, v_stock, v_avail, v_pshop
      from products where id = v_pid for update;
    if not found then
      raise exception 'Product % not found', v_pid;
    end if;
    if v_pshop != p_shop_id then
      raise exception 'All items must come from one shop';
    end if;
    if not v_avail or v_stock < v_qty then
      raise exception 'Insufficient stock for item %', v_pid;
    end if;
    v_total := v_total + v_price * v_qty;
  end loop;

  insert into orders (shop_id, customer_id, type, payment_method, total_amount,
      status, customer_name, customer_phone, customer_address)
  values (p_shop_id, v_uid, p_type::order_type,
    coalesce(nullif(p_payment, ''), 'Cash on Delivery'),
    v_total, 'Pending', v_name, coalesce(v_phone, ''),
    case when p_type = 'Delivery' then coalesce(p_address, '')
         else 'Store Pickup (Counter Collection)' end)
  returning id into v_order_id;

  for item in select * from jsonb_array_elements(p_items) loop
    v_pid := (item ->> 'product_id')::uuid;
    v_qty := (item ->> 'quantity')::int;
    select price, name into v_price, v_name from products where id = v_pid;
    insert into order_items (order_id, product_id, name, unit_price, quantity, subtotal)
    values (v_order_id, v_pid, v_name, v_price, v_qty, v_price * v_qty);
    update products
      set stock_quantity = stock_quantity - v_qty,
          is_available = (stock_quantity - v_qty) > 0
      where id = v_pid;
  end loop;

  return v_order_id;
end;
$$;

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table shops enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table presets enable row level security;
alter table preset_items enable row level security;

-- profiles: owners read/update their own row
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
  for select using (auth.uid() = id);
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update using (auth.uid() = id);

-- shops: public catalogue; vendors insert own; vendors edit own or claim unclaimed
drop policy if exists shops_public_read on shops;
create policy shops_public_read on shops
  for select using (true);
drop policy if exists shops_vendor_insert on shops;
create policy shops_vendor_insert on shops
  for insert with check (auth.uid() = owner_id);
drop policy if exists shops_vendor_update on shops;
create policy shops_vendor_update on shops
  for update
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

-- products: public catalogue; editable through owned (or unclaimed demo) shops
drop policy if exists products_public_read on products;
create policy products_public_read on products
  for select using (true);
drop policy if exists products_vendor_write on products;
create policy products_vendor_write on products
  for all
  using (exists (
    select 1 from shops s
    where s.id = products.shop_id
      and (s.owner_id = auth.uid() or s.owner_id is null)))
  with check (exists (
    select 1 from shops s
    where s.id = products.shop_id
      and (s.owner_id = auth.uid() or s.owner_id is null)));

-- orders: customers see own; vendors see orders for shops they own
drop policy if exists orders_customer_read on orders;
create policy orders_customer_read on orders
  for select using (auth.uid() = customer_id);
drop policy if exists orders_vendor_read on orders;
create policy orders_vendor_read on orders
  for select using (exists (
    select 1 from shops s
    where s.id = orders.shop_id and s.owner_id = auth.uid()));
-- inserts go through place_order(); direct inserts still require self ownership
drop policy if exists orders_customer_insert on orders;
create policy orders_customer_insert on orders
  for insert with check (auth.uid() = customer_id);
-- status updates: customer cancels own pending order; vendor advances own-shop orders
drop policy if exists orders_customer_cancel on orders;
create policy orders_customer_cancel on orders
  for update using (auth.uid() = customer_id and status = 'Pending');
drop policy if exists orders_vendor_update on orders;
create policy orders_vendor_update on orders
  for update using (exists (
    select 1 from shops s
    where s.id = orders.shop_id and s.owner_id = auth.uid()));

-- order_items: visible wherever the parent order is visible
drop policy if exists order_items_read on order_items;
create policy order_items_read on order_items
  for select using (exists (
    select 1 from orders o
    left join shops s on s.id = o.shop_id
    where o.id = order_items.order_id
      and (o.customer_id = auth.uid() or s.owner_id = auth.uid())));
drop policy if exists order_items_insert on order_items;
create policy order_items_insert on order_items
  for insert with check (exists (
    select 1 from orders o
    where o.id = order_items.order_id and o.customer_id = auth.uid()));

-- presets: owner-only
drop policy if exists presets_owner on presets;
create policy presets_owner on presets
  for all using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);
drop policy if exists preset_items_owner on preset_items;
create policy preset_items_owner on preset_items
  for all using (exists (
    select 1 from presets p
    where p.id = preset_items.preset_id and p.customer_id = auth.uid()))
  with check (exists (
    select 1 from presets p
    where p.id = preset_items.preset_id and p.customer_id = auth.uid()));

-- ---------- Product image bucket (optional) ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');
drop policy if exists product_images_vendor_write on storage.objects;
create policy product_images_vendor_write on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and exists (select 1 from profiles where id = auth.uid() and role = 'vendor'));

-- ---------- Demo seed (unclaimed shops; vendors claim them in-app) ----------
insert into shops (name, address, timings, description, is_open) values
  ('Gupta General Store', 'Shop 12, Sector 4 Main Market', '7:00 AM - 10:00 PM',
   'Trusted neighbourhood store for grains, pulses, spices, and kitchen essentials.', true),
  ('Sharma Kirana & Provisions', 'Opposite City Hospital, Station Road', '6:30 AM - 9:30 PM',
   'Fresh daily dairy, baking essentials, snacks, and morning staples.', true),
  ('Apna Daily Mart', 'Corner Shop 3, Railway Colony', '8:00 AM - 10:30 PM',
   'Beverages, toiletries, packaged foods, and cleaning supplies.', true)
on conflict do nothing;

-- Seed products against the demo shops by name
with s as (select id, name from shops)
insert into products (shop_id, name, category, price, unit, stock_quantity, is_available)
select s.id, v.name, v.category, v.price, v.unit, v.stock, v.avail
from s join (values
  ('Gupta General Store', 'Aashirvaad Shudh Chakki Atta', 'Flours & Grains', 235.0, '5 kg', 15, true),
  ('Gupta General Store', 'Fortune Sunlite Sunflower Oil', 'Oils & Ghee', 155.0, '1 Litre', 12, true),
  ('Gupta General Store', 'Tata Salt (Iodized)', 'Spices & Salt', 28.0, '1 kg', 30, true),
  ('Gupta General Store', 'India Gate Basmati Rice Feast', 'Rice & Grains', 140.0, '1 kg', 8, true),
  ('Gupta General Store', 'Tata Sampann Toor Dal (Unpolished)', 'Pulses & Dals', 175.0, '1 kg', 10, true),
  ('Gupta General Store', 'MDH Deggi Mirch Powder', 'Spices & Salt', 92.0, '100 g', 20, true),
  ('Gupta General Store', 'Madhur Pure & Hygienic Sugar', 'Essentials', 52.0, '1 kg', 25, true),
  ('Sharma Kirana & Provisions', 'Amul Taaza Homogenised Toned Milk', 'Dairy & Eggs', 33.0, '500 ml', 24, true),
  ('Sharma Kirana & Provisions', 'Amul Butter (Pasteurised)', 'Dairy & Eggs', 58.0, '100 g', 18, true),
  ('Sharma Kirana & Provisions', 'Harvest Gold White Bread', 'Bakery', 45.0, '400 g', 14, true),
  ('Sharma Kirana & Provisions', 'Wagh Bakri Premium CTC Tea', 'Tea & Coffee', 160.0, '250 g', 15, true),
  ('Sharma Kirana & Provisions', 'Britannia Good Day Butter Cookies', 'Snacks & Biscuits', 30.0, '120 g', 22, true),
  ('Sharma Kirana & Provisions', 'Farm Fresh Brown Eggs (Pack of 6)', 'Dairy & Eggs', 65.0, '6 pcs', 8, true),
  ('Sharma Kirana & Provisions', 'Nestle Classic Coffee Jar', 'Tea & Coffee', 195.0, '50 g', 0, false),
  ('Apna Daily Mart', 'Maggi 2-Minute Masala Noodles', 'Instant Foods', 56.0, '4-pack (280g)', 20, true),
  ('Apna Daily Mart', 'Vim Dishwash Gel (Lemon)', 'Cleaning & Household', 115.0, '500 ml', 16, true),
  ('Apna Daily Mart', 'Surf Excel Easy Wash Detergent Powder', 'Cleaning & Household', 145.0, '1 kg', 10, true),
  ('Apna Daily Mart', 'Dettol Original Germ Protection Soap', 'Personal Care', 72.0, 'Pack of 3', 12, true),
  ('Apna Daily Mart', 'Haldiram''s Bhujia Sev', 'Snacks & Biscuits', 95.0, '400 g', 15, true),
  ('Apna Daily Mart', 'Tata Tea Gold', 'Tea & Coffee', 170.0, '250 g', 7, true)
) as v(shop, name, category, price, unit, stock, avail) on (s.name = v.shop)
on conflict do nothing;
