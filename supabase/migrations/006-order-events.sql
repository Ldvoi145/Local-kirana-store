-- ============================================================
-- 006: order lifecycle ledger (showable transaction data).
-- Run once in the Supabase SQL editor.
-- - orders.updated_at for sorting/filtering
-- - order_events append-only timeline (creation + every status change)
-- - place_order logs the Pending creation event
-- - status changes are logged by the app (updateOrderStatus action)
-- - backfills one creation event per existing order
-- No rows are deleted. User accounts untouched.
-- ============================================================

alter table orders
  add column if not exists updated_at timestamptz not null default now();

create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  changed_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx
  on order_events (order_id, created_at);

alter table order_events enable row level security;

drop policy if exists order_events_customer_read on order_events;
create policy order_events_customer_read on order_events
  for select using (exists (
    select 1 from orders o
    where o.id = order_events.order_id
      and o.customer_id = auth.uid()));

drop policy if exists order_events_vendor_read on order_events;
create policy order_events_vendor_read on order_events
  for select using (exists (
    select 1 from orders o
    join shops s on s.id = o.shop_id
    where o.id = order_events.order_id
      and s.owner_id = auth.uid()));

drop policy if exists order_events_writer_insert on order_events;
create policy order_events_writer_insert on order_events
  for insert with check (
    auth.uid() = changed_by
    and exists (
      select 1 from orders o
      left join shops s on s.id = o.shop_id
      where o.id = order_events.order_id
        and (o.customer_id = auth.uid() or s.owner_id = auth.uid())));

-- Keep updated_at fresh on every order update.
create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row execute function public.set_orders_updated_at();

-- place_order now also writes the creation event (Pending).
-- Prices still come from the DB, single-shop still enforced.
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

  insert into order_events (order_id, from_status, to_status, changed_by)
  values (v_order_id, null, 'Pending', v_uid);

  return v_order_id;
end;
$$;

-- Backfill: one creation event per pre-existing order.
insert into order_events (order_id, from_status, to_status, changed_by, created_at)
select o.id, null, o.status, o.customer_id, o.created_at
from orders o
where not exists (select 1 from order_events e where e.order_id = o.id);
