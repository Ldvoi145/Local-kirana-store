<!-- SEED: established with the user before implementation; re-run $impeccable document once there's code to capture the actual tokens and components. -->
---
name: Kirana eStore
description: Your local shops. One digital store.
---

# Design System: Kirana eStore

## Overview

**Creative North Star: "The Rate-Board Ledger"**

The store speaks like the painted rate-board outside a kirana and keeps books like the shopkeeper's khata. Prices sit in even rows, stock reads as a rubber stamp, and the restock ticket looks torn from the counter pad. One loud voice carries the shop identity, everything around it stays quiet so daily ordering stays fast.

This world serves two tasks. Neighbours scan shops and reorder staples in seconds. Shopkeepers read demand at a glance and restock only what moves. Density is welcome in the vendor dashboard and restraint rules the customer storefront. Motion answers actions such as adding to cart or advancing an order, never decorates the page.

**Key Characteristics:**

- Rate-board rows carry prices, not floating cards
- Rubber-stamp stock marks say what is available
- One marigold accent marks the single next action
- Flat paper surfaces with depth only on touch
- Left aligned reading with generous separation between groups

## Colors

Restrained strategy: green-tinted ledger neutrals plus one marigold accent. The accent marks the primary action only.

### Primary

- **Deep Kirana Leaf** (#0E4D2B): shop header field, primary buttons, vendor dashboard frame. White text sits on it.

### Secondary

- **Turmeric Marigold** (#D9930D): the single next action such as reorder or restock, plus low-stock stamps. Ink text sits on it.

### Neutral

- **Ledger Paper** (#EAF0E2): application ground, a green-tinted khata page rather than warm cream.
- **Counter White** (#FFFFFF): cards and ticket surfaces that sit on the ledger ground.
- **Shop Ink** (#17211B): body text, prices, headings.
- **Chili Red** (#B3261E): out-of-stock and error states only.

### Named Rules

**The One Voice Rule.** The marigold accent owns at most one action per viewport. Its rarity is the point.

## Typography

**Display Font:** Baloo 2 (with system rounded fallback)
**Body Font:** system-ui stack (with Segoe UI, Roboto, Arial fallback)

**Character:** The display face borrows the rounded confidence of hand-painted shop signage for shop names and big rate-board figures. The system stack does all ordering work so labels stay familiar and fast.

### Hierarchy

- **Display** (700, [to be resolved during implementation]): shop names and hero rate figures only.
- **Headline** (700, [to be resolved during implementation]): section titles in storefront and vendor dashboard.
- **Title** (600, [to be resolved during implementation]): product names and order rows.
- **Body** (400, [to be resolved during implementation], 65–75ch): descriptions, addresses, helper text.
- **Label** (600, [to be resolved during implementation]): stock stamps, status marks, form labels in sentence case.

### Named Rules

**The Signage Stays on the Sign Rule.** Baloo 2 names shops and figures. Buttons, inputs, and table data stay in the system face.

## Layout

A single ledger column carries the store, widening to a rate-board grid for catalogs and a dense working table for the vendor dashboard. Content aligns left so prices and quantities scan in straight columns. Tight groups hold a product with its price and stamp, generous space separates shops, orders, and insight blocks. Home lists nearby shops, catalog reads as board rows, checkout and vendor views keep one primary action visible. Breakpoints collapse sidebar detail into stacked rows at mobile widths. Exact containers and spacing land during implementation.

## Elevation & Depth

Flat by default. Paper surfaces rest on tonal layering between ledger ground and counter white, with hairline borders drawn from the palette. Shadows appear only as a response to touch, hover, or focus on an actionable surface.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadow answers a state change, never decorates a resting card.

## Shapes

Soft counter corners with a stamp-like bluntness. Cards and tickets take a gentle radius (12–16px range to be confirmed in code), stamps and status marks take small pill forms, inputs take a smaller steady radius shared across the whole surface. No hard offset block shadows and no clipped geometric masks.

## Do's and Don'ts

### Do:

- **Do** set prices and quantities in straight left-aligned columns so neighbours compare shops at speed.
- **Do** pair marigold with ink text and leaf green with white text for readable contrast.
- **Do** write controls as plain actions such as add to cart, save preset, and mark ready.

### Don't:

- **Don't** chop the page into identical icon cards or hero metric blocks with big numbers and small labels.
- **Don't** spend the accent on decoration, inactive states, or secondary links.
- **Don't** use all-caps eyebrows, numbered section markers, gradient text, or glass blur as decoration.
