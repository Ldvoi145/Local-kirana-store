-- ============================================================
-- 004: wipe ALL shops and everything attached to them.
-- Run once in the Supabase SQL editor.
-- Leaves user accounts (auth.users + profiles) untouched.
-- Order matters because of RESTRICT guards:
--   order_items.product_id + orders.shop_id block parent deletes.
-- Presets + preset_items + products cascade from shops automatically,
-- but we delete products explicitly after order_items are gone.
-- ============================================================

delete from order_items;

delete from orders;

delete from products;

delete from shops;

-- Confirm: all four should be 0.
select (select count(*) from shops) as shops,
       (select count(*) from products) as products,
       (select count(*) from orders) as orders,
       (select count(*) from order_items) as order_items;
