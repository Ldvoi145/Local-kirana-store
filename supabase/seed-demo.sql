-- ============================================================
-- Optional demo seed. Run AFTER schema.sql only if you want the three
-- pre-filled neighbourhood stores for a quick tour.
-- Real vendors add their own shops in-app (Vendor -> Your stores).
-- Safe to run once; re-running duplicates rows (no unique guard on names).
-- ============================================================

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
