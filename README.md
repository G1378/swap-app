# Batch 5 — Gamification (MVP) + Cash Top-Up Removal

This zip contains only new/modified files, laid out at the paths they
belong at in the `swap-app` repo. Copy them in directly, preserving
folders.

## What's new

**Cash top-up removed**
- `cash_offer_cents` is gone: dropped from the `swap_requests` table, and
  every code path that read/wrote/displayed it (offer builder, both offer
  dialogs, the bundle summary, the swaps list, the swap detail page,
  `lib/swap-requests.ts`, `lib/mappers.ts`) has been stripped back to a
  pure item-for-item flow. `formatCents`/`dollarsToCents` in `lib/utils.ts`
  existed only for this feature and are removed too.
- The Revenue Model's "small commission on cash top-up payments" line is
  gone from `PROJECT_PLAN.md` — and, more importantly, so is the feature
  it depended on. Swap-app is a pure swap marketplace: no cash-for-item,
  and cash is never used to balance an uneven trade.

**Trader Levels, XP & Tiers**
- New `gamification_profiles` table: one row per profile with `xp`,
  `level`, `tier` (Bronze/Silver/Gold/Platinum), `points_balance`, and
  weekly streak counters. Auto-provisioned via an `after insert on
  profiles` trigger (plus a one-time backfill for existing profiles), so
  the app can assume every profile has one.
- XP amounts, level thresholds, and tier perks are all defined in
  `lib/gamification/constants.ts` — one file, easy to retune.

**Streaks & Quests**
- Streak counters live on `gamification_profiles`
  (`current_streak_weeks` / `longest_streak_weeks` / `last_activity_week_start`).
- New `quests` catalog + `user_quest_progress` table, seeded with the 5
  weekly quests from the spec ("List a new item," "Reply to a match,"
  "Complete a swap," plus two more) and 5 seasonal ones tied to the launch
  categories.

**Leaderboards**
- No new table — computed from existing `swap_requests`/`listings`/
  `profiles` data. See `GAMIFICATION.md` for exactly which columns back
  each metric and how category/regional scoping and the monthly reset
  work.

**Swap Points**
- New `points_transactions` table: an append-only, auditable earn/spend
  ledger. `points_balance` on `gamification_profiles` should always equal
  the sum of a profile's transactions. Reasons and costs for each
  redeemable perk are in `lib/gamification/constants.ts`.

## What this batch deliberately does *not* do

Schema, types, and tuning constants only — no automatic XP/points
awarding, no streak bookkeeping, no quest-progress updates yet. The
migration's closing comment points at the exact hook (`handle_swap_request_
after_update()`'s existing `'completed'` branch) for wiring that up next.
Tier perks and points-shop redemptions are documented as data but not yet
enforced anywhere (no listing-cap check, no search-ranking boost, no
featured-listing redemption flow). Full rationale in `GAMIFICATION.md`.

## Files touched

New:
```
prisma/migrations_manual/0010_gamification_and_cash_removal.sql
types/gamification.ts
lib/gamification/constants.ts
PROJECT_PLAN.md
GAMIFICATION.md
```

Full replacement files (overwrite existing):
```
prisma/schema.prisma
types/index.ts
lib/mappers.ts
lib/utils.ts
lib/swap-requests.ts
components/offer-builder.tsx
components/swap-request-dialog.tsx
components/counter-offer-dialog.tsx
components/offered-bundle-summary.tsx
components/swaps-list.tsx
app/swaps/[id]/page.tsx
README.md (this file)
```

Not touched — verified no other file in the repo references
`cashOfferCents`/`cash_offer_cents`, `formatCents`, or `dollarsToCents`:
grepped the full `app/`, `components/`, `lib/`, `types/` trees.

## Setup steps

1. **Run the migration** in the Supabase SQL editor, after 0001–0009:
   `0010_gamification_and_cash_removal.sql`.
2. **Copy files in**, preserving paths (see list above).
3. **No new npm dependencies.**
4. Restart the dev server.

**Heads up on existing data:** dropping `cash_offer_cents` permanently
discards whatever cash amounts were sitting on existing swap requests —
there's no migration path for that value since the feature it supported no
longer exists. If any pending/accepted requests currently have a non-zero
cash offer, decide how you want to handle those in-flight conversations
(e.g. a heads-up message) before running this against a database with real
data in it.

## Verification

No live Postgres/Supabase instance or `binaries.prisma.sh` access in this
environment, so verification here was:
- `npx tsc --noEmit` — clean, no type errors.
- `npx next build` — clean production build, all routes compiled
  (including `/swaps` and `/swaps/[id]`, the pages most affected by the
  cash removal).
- Every file in `prisma/migrations_manual/`, including the new one, parsed
  successfully with a standalone Postgres SQL parser (`pglast`) as a
  syntax sanity check, since `prisma validate`/`prisma generate` need an
  engine binary this sandbox can't reach.

Worth running `npx prisma validate` and the migration itself against a
real Supabase project before merging, as usual.
