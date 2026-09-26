<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kirana eStore — Agent Guide (Next.js + Supabase rewrite)

> Legacy Flask backend removed: `app.py`, `database.py`, `__pycache__/`, `kirana.db`, `templates/`, `static/`, v1 `README.md`, `VIVA_GUIDE.md` deleted.
> New build lives in Next.js + Supabase in this directory.

## Locked stack decisions

- Framework: Next.js App Router + TypeScript, Tailwind. Deploy on Vercel.
- Backend: Supabase — Auth, Postgres + RLS, Storage (product images), Realtime (vendor live orders).
- Customer login: email + password (Supabase Auth). No phone OTP in this phase.
- Vendor auth: required. `profiles.role` is `customer` or `vendor`. `shops.owner_id` links to vendor profile.

## Data model (Supabase Postgres)

- `profiles(id FK auth.users, role, name, phone, address)`
- `shops(id, owner_id FK profiles, name, address, lat, lng, timings, is_open)`
- `products(id, shop_id FK shops, name, category, price, unit, stock_quantity, is_available, image_url)`
- `orders(id, shop_id FK shops, customer_id FK profiles, type, payment, total, status, created_at)`
- `order_items(order_id FK orders, product_id FK products, name, qty, subtotal)`
- `presets(id, customer_id FK profiles, shop_id FK shops, name)` + `preset_items(preset_id, product_id, qty)`

RLS: vendors CRUD only own shops/products and read only own orders. Customers read shops/products, CRUD only own orders/presets. Stock decrement in a Postgres transaction function, never client-side math.

## Routes

- `/` shop discovery (SSR), `/shop/[id]` catalog + search, `/cart`, `/checkout`, `/orders`, `/presets`
- `/vendor` dashboard (auth + role gate): orders pipeline `Pending → Preparing → Ready → Completed`, inventory CRUD, `insights` tab
- Auth: `/login`, `/signup`. Middleware protects `/cart` checkout, `/orders`, `/presets`, `/vendor`.

## Features to build

1. Vendor insights (SQL aggregates, no AI API): bestsellers by qty + revenue with 7d/30d/all filters, slow/dead stock with zero sales in X days, restock advisor scoring sales velocity × days-of-cover left. Output is a restock ticket plus a skip list with reasons. Empty state until 5+ orders.
2. Customer reorder: most ordered, due for reorder from average interval per product, pairs well with from co-bought items in the same order. Keyed to `auth.uid()`.
3. Presets: save cart as named preset per customer + shop, one-click add back, edit and delete.
4. Cart keeps the v1 single-shop rule, enforced server-side.

## Visual authority

`design.md` (seed) owns the visual world: Rate-Board Ledger, restrained color, flat by default. Read it before writing UI. Re-run documentation once real tokens exist.

## Build status

Scaffolded and verified: `tsc --noEmit`, `eslint src proxy.ts`, and
`next build` all pass. Routes: `/`, `/shop/[id]`, `/cart`, `/order/[id]`,
`/orders`, `/presets`, `/vendor`, `/login`, `/signup`. `proxy.ts` guards auth
routes. App runs without `.env.local` (empty states) and lights up fully once
`supabase/schema.sql` is applied. Remaining: connect a Supabase project and
click-test checkout, vendor claim, insights, and presets end to end.

## Next build order

1. `supabase/schema.sql` with tables, RLS, seed shops/products.
2. Auth + middleware + role gate.
3. Storefront routes, then cart/checkout transaction, then vendor dashboard + insights, then presets.

## Do not

- Do not revive Flask, Jinja, or SQLite paths.
- Do not add phone OTP, payment gateways, or geolocation sorting in this phase. Record as open decisions.
