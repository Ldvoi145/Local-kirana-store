# Kirana eStore

> Your local shops. One digital store.

Next.js App Router + Supabase rewrite. Customers log in, order from nearby
kiranas, get reorder suggestions and presets. Shopkeepers get live orders,
inventory, and restock insights.

## Run it

1. Install: `npm install`
2. Create a Supabase project, then copy env:
   ```bash
   cp .env.example .env.local
   ```
   Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. In the Supabase SQL editor, run `supabase/schema.sql` once (tables, RLS,
   `place_order` transaction), then `supabase/migrations/002-vendor-ownership.sql`.
   Optional: `supabase/seed-demo.sql` for 3 pre-filled demo stores.
4. Start: `npm run dev`, open http://localhost:3000

Without `.env.local` the app still runs and renders empty states.

## Demo script

- Home lists shops. Search finds items across every store.
- Sign up as customer, add items to the cart, check out (pickup or delivery).
- Sign up as vendor, open Vendor, add your own shop, then add products to its rate board.
- Vendor tabs: Orders (advance Pending → Preparing → Ready → Completed),
  Inventory (add/edit/delete, toggle open), Insights (bestsellers, restock
  ticket, slow movers after a few orders).
- Save a cart as a preset, reload it later from Presets in one tap.

## Structure

- `supabase/schema.sql` — Postgres schema, RLS (`seed-demo.sql` optional demo data)
- `src/app/` — routes; `src/app/actions/` — Server Actions
- `src/lib/` — Supabase clients, data-access layer, analytics, cart store
- `src/components/` — header, stamps, buttons, rails, lists
- `agent.md` — agent build guide; `design.md` — Rate-Board Ledger seed system
