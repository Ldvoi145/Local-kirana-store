# Transactions ledger + QR entry

## What shipped
- `order_events` append-only table + `orders.updated_at` (`supabase/migrations/006-order-events.sql`, merged into `supabase/schema.sql`).
- `place_order` logs Pending creation; `updateOrderStatus` (`src/app/actions/shop.ts`) logs every status change and refreshes vendor + customer pages.
- Vendor `/vendor?tab=transactions`: filters (status, type, payment, dates, search), collected totals, payment breakdown (Cash on Delivery / UPI / Card), CSV export. Counter QR per owned shop (`src/components/shop-qr.tsx`).
- Customer `/orders`: same filters (status, payment, dates, search), spent total, payment split, CSV export. `/order/[id]`: line items + transaction trail timeline (`src/lib/transactions.ts`, `src/lib/dal.ts`).
- Cart checkout now records payment mode via selector (`src/app/cart/page.tsx`, normalized in `shop.ts`).
- QR login loop: `/shop/[id]` requires session (`src/app/shop/[id]/page.tsx` + `proxy.ts` guard on `/shop`, `/order`, `/cart`), redirects to `/login?next=/shop/[id]`; login/signup preserve `next` across links (`src/components/auth-form.tsx`) and land back on the shop. Logged-in scans skip auth.

## Run once in Supabase SQL editor
1. `supabase/migrations/006-order-events.sql` (creates table, RLS, trigger, new `place_order`, backfills one creation event per old order).
2. Verify: `select count(*) from order_events;` grows by 1 per new order and per vendor status advance.

## Try it
1. Vendor: `/vendor` → Transactions → filter → Export CSV; QR block → scan/print.
2. Customer: scan QR (logged out) → login/signup → lands back on shop → cart (pick UPI/Card) → place order → `/orders` filters + export → `/order/[id]` trail.
3. Vendor advances status in Orders tab → both trails update.

## Notes
- QR image uses a public QR API; the encoded link is always your own origin + `/shop/[id]`, so it works per deploy.
- Event inserts require `changed_by = auth.uid()` and visibility on the parent order (customer-own or vendor-own-shop).
