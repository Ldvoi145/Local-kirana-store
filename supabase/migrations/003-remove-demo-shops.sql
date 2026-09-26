-- ============================================================
-- 003: remove the demo seed shops and everything attached to them.
-- Run once in the Supabase SQL editor.
-- Only touches UNCLAIMED shops (owner_id IS NULL). Stores a vendor
-- already claimed are left alone, as are all user accounts.
-- Order matters: line items -> orders -> products -> shops, because
-- of the restrict guards on order_items.product_id and orders.shop_id.
-- (preset rows cascade automatically.)
-- ============================================================

delete from order_items
where order_id in (
  select id from orders
  where shop_id in (select id from shops where owner_id is null)
);

delete from orders
where shop_id in (select id from shops where owner_id is null);

delete from products
where shop_id in (select id from shops where owner_id is null);

delete from shops where owner_id is null;

-- Confirm: both counts should now reflect only vendor-owned stores.
select (select count(*) from shops) as shops,
       (select count(*) from products) as products;
