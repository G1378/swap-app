# Discover reel — changed files

Copy these into your local swap-app checkout at the same relative paths
(they overwrite what's there now). Verified with a clean install + tsc +
next build before packaging.

## New files
- `components/discover-reel.tsx` — the swipeable feed container. Owns all
  gesture state (pointer drag, wheel, keyboard), paging, and decides which
  overlay opens for the active card.
- `components/reel-card.tsx` — the full-bleed card itself (photo, gradient,
  title/description, owner line, action rail). Purely presentational.

## Modified files
- `app/discover/page.tsx` — now fetches reel data (listings with the
  viewer's own + blocked listings excluded, owners, the viewer's own
  inventory, wishlist state, active swap requests) and renders
  `<DiscoverReel />` instead of `<DiscoverGrid />`.
- `lib/listings.ts` — `getOwnersByListingOwnerId` now also returns
  `avatarUrl` (small widen, non-breaking); added `getMyAvailableListings`
  (extracted from the inline query `app/listings/[id]/page.tsx` already
  had, now shared).
- `lib/swap-requests.ts` — added `findActiveSwapRequestsForListings`, a
  bulk version of `findActiveSwapRequest` so the feed does one query for
  "already requested?" instead of one per listing.
- `lib/constants.ts` — added `REEL_GESTURE`, the shared gesture-tuning
  constants (thresholds, timing). Lives here rather than in either
  component so `discover-reel.tsx` and `reel-card.tsx` can both import it
  without depending on each other.
- `next.config.mjs` — merged in the one real setting from `next.config.js`
  (see below).

## Delete this file
- **`next.config.js`** — your repo has both `next.config.js` and
  `next.config.mjs`. Next.js treats that as a hard build error ("Both
  next.config.js and next.config.mjs found..."), so `next dev`/`next build`
  were almost certainly already failing at startup, for a reason unrelated
  to this feature. `next.config.mjs` (included here) now has everything
  both files had — the Supabase image `remotePatterns` your app needs,
  plus the `serverActions.allowedOrigins` setting from the old file
  (currently unused — nothing in the app calls a Server Action yet — kept
  so nothing is silently lost).

## Not touched, but worth knowing about
- `app/discover/[category]/page.tsx` still exists and still works (same
  grid + filters as before), but nothing links to it anymore now that the
  category chips are gone from `/discover`. It's a dead end unless someone
  types the URL directly. Say the word if you'd like it removed, or wired
  back in some other way.
- Your repo root also has a handful of leftover files from an earlier
  scaffold — `page.tsx`, `layout.tsx`, `route.ts`, `auth.ts`,
  `next-auth.d.ts`, `prisma.ts`, `schema.prisma`, `globals.css` at the top
  level, plus an accidentally-committed `mnt/user-data/...` directory.
  Next.js's App Router ignores all of these (it only reads `app/`), so
  they're not breaking anything — just clutter. Left alone since it's
  unrelated to this change.
