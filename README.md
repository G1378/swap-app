# Batch 3 — Delete Listing, Multi-Photo, Member Search, Category Pages, Block/Report

This zip contains only new/modified files, laid out at the paths they
belong at in the `swap-app` repo. Copy them in directly, preserving folders.

## What's new

**Delete a listing**
- Delete already existed on the Edit page — this batch hardens it rather
  than duplicating it:
  - Migration `0007` adds a DB-level trigger blocking deletion of any
    listing that's part of an active (pending/accepted) swap, as either
    the requested item *or* the offered item. Without this, deleting a
    listing mid-swap would silently cascade-delete the `swap_requests`
    row (and its conversation), destroying the other party's negotiation
    with no warning.
  - The Edit page's Delete button now only shows for `available`
    listings; a short explanation replaces it otherwise.
  - New **quick-delete** directly from the Listings grid on your own
    profile (`owned-listing-card.tsx`) — no need to open Edit first.
  - Both delete paths now also clean up the listing's storage files
    (cover + gallery) best-effort.

**Multi-photo listings**
- Migration `0007` adds a `listing_photos` table (up to 4 extra photos on
  top of the existing single cover photo — `listings.image_url` is
  untouched, so every existing card/consumer keeps working as-is).
- Listing detail page now shows a real gallery with thumbnail switching.
- Edit page gets a gallery editor (`components/listing-gallery.tsx`) —
  add/remove save immediately, independent of the main form's Save button.
- Scoped out: gallery editing on the **create** flow. A listing needs to
  exist (and satisfy the owner-only RLS check) before photos can attach to
  it, so multi-photo is edit-only; the create form just hints at this.

**Member search/directory**
- New `/members` page — searchable by name, username, or location, mirrors
  the same instant client-side filtering pattern as Discover.
- Added "Members" to the navbar.

**Category browse pages**
- New `/discover/[category]` routes with real, shareable URLs.
- Discover's category chips are now actual links to these routes instead
  of client-only state, so every category is browsable/bookmarkable even
  with zero current listings in it.
- Condition filter, sort, and search stay client-side within whichever
  category view you're on.
- Extracted `LISTING_CATEGORIES`/`LISTING_CONDITIONS` out of
  `listing-form.tsx` into `lib/constants.ts` as the shared source of truth.

**Block / report users**
- Migration `0008` adds `blocks` and `reports` tables, plus updates the
  `swap_requests` insert policy so a swap request can't be created between
  two users with a block relationship in either direction (defense in
  depth — not just a UI hint).
- New "..." menu on other users' profiles (`profile-actions-menu.tsx`):
  Report user (reason + optional details) and Block/Unblock.
- Blocked users' listings and profiles are filtered out of Discover,
  category pages, and Members for both parties.
- Reports are stored for later manual review — **there's no admin
  dashboard in this app**, so nothing currently reads the `reports` table.
  Flagging that as a known gap rather than pretending it's handled.
- Scoped out: telling a user they've been blocked (kept private, matching
  how most apps handle this), and retroactively hiding existing chat
  history between blocked users (blocking stops *new* contact; past
  conversations stay visible, which is standard behavior elsewhere too).

## Files touched

New:
```
prisma/migrations_manual/0007_listing_lifecycle.sql
prisma/migrations_manual/0008_trust_safety.sql
lib/constants.ts
lib/storage.ts
lib/listing-photos.ts
lib/listings.ts
lib/blocks.ts
lib/reports.ts
components/listing-gallery.tsx
components/listing-photo-viewer.tsx
components/member-card.tsx
components/member-search-grid.tsx
components/profile/profile-actions-menu.tsx
app/discover/[category]/page.tsx
app/members/page.tsx
```

Full replacement files (overwrite existing):
```
types/index.ts
lib/mappers.ts
lib/profiles.ts
components/listing-form.tsx
components/owned-listing-card.tsx
components/discover-grid.tsx
components/navbar.tsx
components/profile/profile-view.tsx
app/discover/page.tsx
app/listings/[id]/page.tsx
app/listings/[id]/edit/page.tsx
```

## Setup steps

1. **Run both migrations** in the Supabase SQL editor, in order:
   `0007_listing_lifecycle.sql`, then `0008_trust_safety.sql`.
2. **Copy files in**, preserving paths (see list above).
3. **No new npm dependencies.**
4. Restart the dev server.
