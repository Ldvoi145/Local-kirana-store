# Customer / vendor separation + item requests

## Roles (already enforced, kept)
- Customer: cart add/remove (`src/lib/cart.tsx` + `AddButton`), checkout, presets, order tracking, item suggestions. No rate-board edits: `addProduct` / `updateProduct` / `deleteProduct` / `toggleShopOpen` / `claimShop` / `createShop` all require `profiles.role = vendor` + shop ownership (`src/app/actions/shop.ts`). Vendor dashboard (`src/app/vendor/page.tsx`) gates non-vendors; header shows Vendor link only to vendors, Presets only to customers (`src/components/site-header.tsx`).
- Vendor: owns stores, manages rate board, advances orders, reads transactions + requests. Cannot touch other vendors' shops (RLS `products_vendor_write` + ownership gate).

## New: suggestions (007)
- `supabase/migrations/007-item-suggestions.sql` (merged into `supabase/schema.sql`): `suggestions` table (shop, customer, customer_name snapshot, item_name, note, status Pending/Approved/Rejected/Added). RLS: customers insert + read own; vendors read/update rows for owned shops only.
- Customer flow: `/shop/[id]` shows `SuggestForm` (`src/components/suggest-form.tsx`) only to non-owners, plus "Your requests" with live statuses. Actions: `suggestItem` / `suggestItemState`.
- Vendor flow: `/vendor?tab=requests` inbox with pending count, customer + note + date, status selector (`updateSuggestionStatus`). Mark Added once the item is on the board.

## Run once in Supabase SQL editor
1. `supabase/migrations/007-item-suggestions.sql`.
2. Verify: customer sends request from a shop page → vendor Requests tab shows it → status change reflects on the customer's shop page list.
