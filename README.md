# Batch 2 — Logout, Notifications, Discover Filters, Read Receipts, Owner Links, Onboarding

This zip contains only new/modified files, laid out at the paths they belong
at in the `swap-app` repo. Copy them in directly, preserving folders.

## What's new

**#1 — Logout**
- `components/user-menu.tsx`: avatar dropdown (My profile / My swaps on
  mobile / Log out) replacing the plain avatar link.

**#2 — Notifications**
- `components/notification-bell.tsx`: bell icon with unread dot, dropdown
  list, click-to-navigate, mark-all-read.
- `lib/notifications.ts`: list / unread count / mark read / mark all read.
- Migration `0005`: adds a `link` column to `notifications` so items are
  clickable, and adds a "you received a rating" notification trigger — the
  `rating` type existed in the DB's check constraint already but nothing
  was ever inserting one.

**#3 — Discover filters**
- `components/discover-grid.tsx`: added a condition filter, a
  newest/oldest sort, and a "Clear filters" action alongside the existing
  search + category chips.
- Scoped out: a location/distance filter. Listings don't carry a location
  field in the schema (only profiles do) — flagging this as a real gap
  rather than faking it off owner location, which would be misleading for
  ship-only trades.

**#4 — Read receipts / unread badges**
- Migration `0005` also adds `conversation_participants.last_read_at`.
- `lib/messages.ts`: `markConversationRead`, `getUnreadMessageCounts`.
- `components/chat-thread.tsx`: marks read on open and when a new message
  arrives while the thread is visible.
- `components/swaps-list.tsx` / `app/swaps/page.tsx`: unread badge per
  swap row.

**#5 — Owner links**
- Listing detail page: owner block is now a link to `/profile/[username]`.
- Swap detail page: "With {name}" links to their profile.
- Discover grid: new owner byline pill on each card
  (`components/listing-owner-badge.tsx` + `listing-card-with-owner.tsx`),
  rendered as a sibling overlay rather than nested inside the card's own
  link — browsers don't allow nested `<a>` tags, so this follows the same
  pattern as the wishlist heart and edit overlay from the profile redesign.

**#7 — Onboarding**
- Migration `0006`: adds `profiles.onboarding_completed` (existing
  profiles with any info already filled in are grandfathered as complete,
  so this doesn't suddenly interrupt current users).
- `app/onboarding/page.tsx`: one-time setup form (name / location / bio).
  "Skip for now" still marks it complete — this is a prompt, not a
  permanent trap.
- `lib/supabase/middleware.ts`: enforces the gate globally. Any signed-in
  request to a non-exempt path (`/onboarding`, `/login`, `/signup`,
  `/auth` are exempt) redirects to `/onboarding` until the flag is set.
  This means login/signup pages didn't need touching — whatever they
  redirect to, middleware intercepts and sends incomplete profiles to
  `/onboarding` regardless.

## Files touched

New:
```
prisma/migrations_manual/0005_inbox_upgrades.sql
prisma/migrations_manual/0006_onboarding.sql
lib/notifications.ts
components/user-menu.tsx
components/notification-bell.tsx
components/listing-owner-badge.tsx
components/listing-card-with-owner.tsx
app/onboarding/page.tsx
```

Full replacement files (overwrite existing):
```
types/index.ts
lib/mappers.ts
lib/utils.ts
lib/messages.ts
lib/supabase/middleware.ts
components/navbar.tsx
components/chat-thread.tsx
components/swaps-list.tsx
components/discover-grid.tsx
components/profile/review-card.tsx
components/profile/edit-profile-dialog.tsx
components/profile/profile-view.tsx
app/swaps/page.tsx
app/swaps/[id]/page.tsx
app/listings/[id]/page.tsx
app/discover/page.tsx
```

## Setup steps

1. **Run both migrations** in the Supabase SQL editor, in order:
   `0005_inbox_upgrades.sql`, then `0006_onboarding.sql`.
2. **Copy files in**, preserving paths (see list above).
3. **No new npm dependencies.**
4. Restart the dev server. New users hitting `/signup` will land on
   `/onboarding` on their next navigation; existing users are unaffected
   unless their profile is completely empty (no name/bio/location), in
   which case they'll also see the onboarding prompt once.

## Note on scope

The full "1-5 and 7" batch was large, so a few things were deliberately
kept out to avoid scope creep — flagging them here rather than silently
skipping:
- Real-time notification delivery (bell only refreshes when opened/on
  navigation, doesn't push live) — would need a Realtime subscription on
  `notifications` similar to the one messages already use.
- Owner byline was only added to the Discover grid, not to Wishlist/Swapped
  tabs on profiles, since those already show whose closet you're looking
  at from context.
