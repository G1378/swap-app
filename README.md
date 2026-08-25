# Batch 4 — Multi-Item Bundles, Cash Top-Up, Counter-Offers

This is the biggest schema change so far — it replaces the swap request's
single `offered_listing_id` column with a proper bundle model, adds cash on
top, and adds real back-and-forth negotiation. This zip contains only
new/modified files, laid out at the paths they belong at in the `swap-app`
repo. Copy them in directly, preserving folders.

## What's new

**Multi-item bundles** — "2 of my listings for your 1"
- A sender can now offer *any number* of their own listings in a single
  request, not just one. New `swap_request_items` table replaces the old
  `offered_listing_id` column (which is dropped, after backfilling
  existing single offers into the new table).
- `swap-request-dialog.tsx`'s item picker is now multi-select instead of
  single-select.

**Cash top-up**
- New `cash_offer_cents` column on `swap_requests` (stored in cents to
  avoid float rounding). Shown as an optional dollar input alongside the
  item picker, and as a "+ $X cash" badge everywhere an offer is displayed.
- This was explicitly called out in your PRD's revenue model ("small
  commission on cash top-up payments") but had no supporting feature at
  all until now — the commission side still isn't implemented (no payment
  processor is wired up anywhere in this app), just the data model and UI
  for the cash amount itself.

**Counter-offers**
- The receiver of a pending request can now propose different terms
  instead of only accept/decline. A counter is a **new** `swap_requests`
  row (linked back via `parent_request_id`), not an edit to the original —
  this preserves full negotiation history. The original row flips to a new
  terminal status, `countered`.
- The chat thread carries over automatically across counters (same
  conversation, not a fresh one each round) — see `handle_new_swap_request`
  in the migration.
- Each counter round works exactly like the original request: whoever
  receives it can Accept / Decline / Counter again, so multi-round
  back-and-forth just falls out of the existing accept/decline UI with no
  special-casing needed.

## A note on transactional safety

Creating a request (or a counter) is two separate writes from the client
— insert the `swap_requests` row, then insert its `swap_request_items`
rows — since the Supabase client doesn't make multi-statement transactions
easy without a dedicated RPC function. If the second write fails after the
first succeeds, you'd be left with an item-less request row. This is a
real but narrow edge case (a mid-request network blip), consistent with
how a failed opening chat message already doesn't roll back request
creation elsewhere in this codebase. Flagging it rather than pretending
it's fully atomic — a proper fix would wrap both writes in a single
Postgres function.

## Files touched

New:
```
prisma/migrations_manual/0009_swap_bundles_and_counters.sql
components/offer-builder.tsx
components/counter-offer-dialog.tsx
components/offered-bundle-summary.tsx
```

Full replacement files (overwrite existing):
```
types/index.ts
lib/mappers.ts
lib/utils.ts
lib/swap-requests.ts
components/swap-request-dialog.tsx
components/swap-actions.tsx
components/swap-status-badge.tsx
components/swaps-list.tsx
app/swaps/[id]/page.tsx
```

Not touched, and don't need to be — verified no other file in the repo
references the removed `offeredListingId`/`offered_listing_id`/
`offeredItem` fields:
```
components/listing-swap-action.tsx   (SwapRequestDialog's external props are unchanged)
app/listings/[id]/page.tsx           (same reason)
app/swaps/page.tsx                   (SwapsList's props are unchanged)
```

## Setup steps

1. **Run the migration** in the Supabase SQL editor:
   `0009_swap_bundles_and_counters.sql`.
2. **Copy files in**, preserving paths (see list above).
3. **No new npm dependencies.**
4. Restart the dev server.

**Heads up on existing data:** if you have any swap requests already sitting
in `pending`/`accepted` status with the old single `offered_listing_id`
when you run this migration, they'll be backfilled into the new bundle
table automatically as part of the migration — no action needed, but worth
knowing before running it against a database with real in-flight swaps.
