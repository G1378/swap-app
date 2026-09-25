# Discover feed: ranking, pagination & "not interested" (Phase 1 + 2)

This is Phases 1 and 2 of turning Discover from "every available listing,
newest first, all loaded at once" into a ranked, paginated feed with a real
negative-feedback loop and text-based matching. See the project brainstorm
thread for the full multi-phase plan; this document covers what's actually
shipped.

## What's shipped

**Phase 1 — feedback loop & pagination**
- **Left swipe / "not interested"** on the active card — via drag, the X
  button, or Backspace/Delete — dismisses a listing for that user, with an
  undo toast and an optional one-tap reason.
- **Cursor-based pagination**: the reel loads pages of ~20 as the viewer
  nears the end of what's loaded, instead of the whole catalogue up front.
- **Behavioural tracking**: impressions (with dwell time), info-opens,
  swap-starts and passes are logged per user, batched client-side. Nothing
  reads this yet — it's the raw material a future learned-ranking phase
  needs.
- **Search covers the whole catalogue**, not just what's loaded (see "Why
  search changed" below).

**Phase 2 — text matching**
- **Two match scores per candidate**, computed against the viewer's own
  listings using Postgres's `pg_trgm` extension: `want_score` (does this
  candidate look like something the viewer asked for?) and `accept_score`
  (does the viewer already own something this candidate's owner is asking
  for?). `accept_score` is weighted higher in ranking — a listing the
  viewer would love from an owner who wants nothing they own is a dead
  end; see the brainstorm.
- **"Good swap odds" / "Matches what you want" badges** on cards when a
  score clears `MATCH_SCORE_THRESHOLD` (0.3, matching pg_trgm's own
  default cutoff).
- **Best-fit item pre-selected** in the swap offer builder: instead of
  always defaulting to whichever of the viewer's listings happens to be
  first, it defaults to whichever one best matches what the receiver said
  they want (a from-scratch, dependency-free trigram-similarity
  reimplementation for this small in-memory comparison — see
  `lib/feed/text-similarity.ts`).

**Still ranking on one signal ahead of both of these**: an owner having
wishlisted one of the viewer's own listings still puts that listing first,
regardless of the two scores above — it's the strongest, cheapest signal
available, and it's never shown to the viewer (see the brainstorm on why
that one stays silent rather than becoming a badge).

## Schema

**`prisma/migrations_manual/0014_discover_feed_feedback.sql`**
- `listing_passes(user_id, listing_id, reason, created_at)` — one row per
  "not interested" swipe. RLS-scoped to the passing user; owners can never
  see who passed on their listing. `reason` is nullable and set after the
  swipe (or never).
- `listing_events(user_id, listing_id, event_type, dwell_ms, position,
  created_at)` — append-only behavioural log. Insert + select-own only, no
  update/delete policies. Plan a retention job (e.g. drop rows >90 days)
  before this grows large.
- Two indexes on `listings` (there were none before): one for the feed's
  `status = 'available' order by created_at desc` scan, one for
  `owner_id + status` lookups.
- `get_discover_feed(p_limit, p_exclude_ids)` — the ranking + pagination
  function (later extended by 0015 — see below).

**`prisma/migrations_manual/0015_discover_feed_text_matching.sql`**
- Enables `pg_trgm` and adds GIN trigram indexes on `listings.title` and
  `listings.wanted_in_return` (not required for the per-viewer scoring
  below — that's a small enough nested loop not to need index
  acceleration — but useful groundwork for scaling free-text listing
  search later without another migration).
- Drops and recreates `get_discover_feed` (Postgres doesn't allow
  `CREATE OR REPLACE` to change a function's return type) with three new
  output columns: `owner_wishlisted_mine`, `want_score`, `accept_score`.
  Ranking: `owner_wishlisted_mine` first, then
  `0.6 * accept_score + 0.4 * want_score` descending, then newest-first as
  the final tiebreak.

Both migrations were applied to and exercised against a real local
Postgres 16 instance — all of 0001–0013, then 0014, then 0015 — with test
cases covering: wishlist-priority ranking beating recency, the combined
text-match score correctly ordering candidates when no wishlist signal is
present, wishlist-priority still winning over a higher combined score when
both are present, pagination via `p_exclude_ids`, pass filtering, RLS
isolation between users, undo, blocking, self-exclusion, and status
filtering. All passed. The client-side trigram similarity function
(`lib/feed/text-similarity.ts`) was separately validated in Node against
realistic listing text before being wired in.

`SECURITY DEFINER` because the function joins across other users'
`wishlist_items`, which RLS otherwise restricts to their own owner; it
only ever returns `listings` columns (already public) plus scores computed
from that join, so the only thing this leaks is ordering. Always uses
`auth.uid()` internally — never takes a viewer id as a parameter — so
nobody can request someone else's feed or scores.

## Data flow

```
app/discover/page.tsx (server)
  → lib/feed/queries.ts: getDiscoverFeedPage()
      → supabase.rpc("get_discover_feed", ...)
      → falls back to the old unranked query if the RPC errors
        (e.g. migration 0014/0015 not yet applied) — Discover keeps
        working, just without ranking/matching/pass-filtering, rather
        than breaking. Fallback listings get zeroed-out scores (see
        toUnscoredDiscoverListing in lib/feed/queries.ts) so the UI
        never has to special-case "missing" scores.
  → components/discover-reel.tsx (client)
      → hooks/use-discover-feed.ts owns the loaded list + paging
      → POST /api/discover/feed for subsequent pages
      → hooks/use-feed-tracker.ts buffers events, flushes to
        POST /api/discover/events
      → lib/feed/passes.ts calls listing_passes directly from the browser
        (RLS-scoped, no API route needed — same pattern as wishlist)
      → components/reel-card.tsx renders the match badges from each
        DiscoverListing's wantScore/acceptScore
      → opening the swap dialog runs lib/feed/text-similarity.ts against
        the viewer's own (already-loaded) listings to pick a default
```

## Why search changed

`components/search-overlay.tsx` used to filter the reel's own `listings`
array, which was fine when that array held the entire catalogue. Now that
the reel is paginated, that array only holds what's been scrolled to, so
the old approach would silently miss most listings. Search now queries the
database directly (`lib/feed/search.ts`), and `onSelectListing` passes back
a full `Listing` (not just an id): if the person picks a result the reel
hasn't loaded yet, `DiscoverReel.revealSearchResult` fetches its owner and
any existing swap request, then splices it into the feed right after the
current card. A revealed result gets zeroed-out match scores (it was never
run through `get_discover_feed`), so it won't show a match badge even if
it would have matched — a narrower version of the same trade-off as the
pagination fallback above.

## Known limitations

- **Trigram matching is lexical, not semantic.** "Wide-angle lens" won't
  match "Sigma 16mm f/1.4" — no shared substrings, even though a person
  would recognize the connection instantly. Catches typo-tolerant/partial
  title overlaps ("PS5" / "PS5 console", "Nintendo Switch" / "Switch
  OLED"), not synonyms. Semantic matching needs embeddings (`pgvector`),
  which is a later phase, not this one.
- **Every available listing gets scored on every request** — the
  `candidates` CTE in `get_discover_feed` has no cap before scoring. Fine
  at the catalogue sizes this product is launching with (a focused niche);
  worth capping (e.g. the most recent N candidates) before scoring once
  the catalogue is large enough for a full scan to show up in query time.
- **Empty-database search has no mock-data fallback.** The main feed falls
  back to `MOCK_LISTINGS` when the `listings` table is empty (see
  `lib/listings.ts`) so Discover still demos something in early dev.
  `searchAvailableListings` doesn't do the same — a fresh, unseeded local
  database will show "No listings found" for every search. Not an issue
  once there's real data; only affects a brand-new local setup.
- **A revealed search result's swap-request state isn't re-checked.** If a
  search result is spliced into the feed, its owner/active-request data is
  fetched once at reveal time. If a swap-request-state change happens
  elsewhere in the same session afterward, that card's swipe-right
  behaviour won't reflect it until the page reloads. Narrow edge case, not
  fixed here to keep this phase's scope bounded.
- **Undo after a failed pass isn't retried.** If saving a pass fails
  server-side, the card is restored locally and the toast says so. If
  *undoing* a successful pass fails server-side, the UI still shows it as
  undone (fire-and-forget) — the pass row would linger and the listing
  could reappear as passed on a future fresh load.

## Event types

`listing_events.event_type`: `impression` (dwell_ms set), `info_open`,
`swap_started`, `pass`. See `types/feed.ts` for the TypeScript side and
`lib/feed/constants.ts` for tuning (batch size, flush interval, minimum
impression duration, match-score threshold, etc).

