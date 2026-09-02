# Batch 6 — Wire up gamification (header pill, profile panel, quests page)

This zip contains only new/modified files, laid out at the paths they
belong at in the `swap-app` repo. Copy them in directly, preserving
folders. **Apply after Batch 5** (migration 0010) — this batch adds
migration 0011 on top of it.

## Why this batch

Batch 5 shipped the gamification *schema* only — tables, types, seed data,
no UI, no awarding logic. That meant nothing was visible: no way to see
your own points/level, no way to see anyone else's, no way to view or
track quests. This batch closes that gap: it wires up real XP/points
awarding and builds the three surfaces prioritized out of the earlier
brainstorm (header pill, profile panel, quests page — leaderboard and
"badges everywhere" were explicitly deferred).

## What's new

**Awarding, for real** (`prisma/migrations_manual/0011_gamification_wiring.sql`)
- Four `SECURITY DEFINER` Postgres functions, called via `supabase.rpc(...)`
  — the first use of `.rpc()` in this app. `gamification_profiles` /
  `points_transactions` / `user_quest_progress` still have no client-write
  RLS policy; these functions are the only path in, and each validates
  eligibility itself (idempotent, safe to call speculatively).
- `claim_swap_completion_reward` — +50 XP / +20 points per participant,
  once per swap. Called from the swap detail page.
- `refresh_quest_board` + `bump_quest_progress` — provisions this week's 3
  rotated-in quests (deterministic round-robin, no stored "assignment")
  and increments progress on the matching action.
- `claim_profile_completion_reward` — one-time +20 XP, piggybacking on the
  existing `profiles.onboarding_completed` flag.
- New column: `gamification_profiles.profile_completed_bonus_awarded`
  (guards the one-time bonus above). Mirrored in `prisma/schema.prisma`.

**Hooked into the actions that should trigger them**
- `lib/wishlist.ts`, `lib/messages.ts`, `lib/ratings.ts` — bump the
  matching quest right after their insert succeeds.
- `components/listing-form.tsx` — bumps `list-an-item` after a new listing
  is published (not on edits).
- `components/profile/edit-profile-dialog.tsx` — claims the
  profile-completion bonus after a save.
- `app/swaps/[id]/page.tsx` — claims the swap-completion reward whenever
  the current viewer looks at a completed swap (covers both participants,
  whichever of them next opens the page).
- All of these are best-effort: on failure they log and move on, never
  block the primary action.

**Three new UI surfaces**
- **Header pill** — tier icon + points balance, always visible when
  signed in (`components/gamification/header-gamification-pill.tsx`,
  wired into `components/navbar.tsx`, which now also fetches the viewer's
  gamification profile alongside their regular profile/notification data).
- **Profile panel** — tier, level, XP progress bar, streak, earned badges;
  points balance only on your own profile
  (`components/gamification/gamification-panel.tsx`, wired into
  `components/profile/profile-header.tsx` via `profile-view.tsx`, so it
  renders on both `/profile` and `/profile/[username]`).
- **Quests page** — this week's 3 rotated quests + active seasonal ones,
  each a simple done/not-done card with a reward chip
  (`app/quests/page.tsx` + `components/gamification/quest-card.tsx`),
  linked from the navbar.
- Supporting pieces: `components/gamification/tier-badge.tsx` (shared
  tier icon/label/color), `components/gamification/user-badge-pill.tsx`
  (renders the new stored `Badge` type — separate from the existing
  ad-hoc `ProfileBadge` pills, which are untouched).

**Reads + types**
- `lib/gamification/queries.ts` (new) — all reads plus the RPC wrappers
  described above.
- `lib/mappers.ts` — row mappers for the four gamification tables.
- `types/gamification.ts` — added `profileCompletedBonusAwarded` and a new
  `LevelProgress` type.
- `lib/gamification/constants.ts` — added `getLevelProgress(xp)`, used by
  the profile panel's XP bar.

## What's still not wired up

- **Referrals** and **chain-leg XP** — inert, no underlying feature exists
  yet for either (no referral system, no multi-person chain matching).
- **Streak counters** — `current_streak_weeks` doesn't update
  automatically yet; needs its own "was last week already counted" logic.
- **Tier perks and points-shop spends** — still documentation-as-data in
  `TIER_PERKS`/`POINTS_COSTS`, not enforced anywhere.
- **Leaderboard page** and **tier badges on member cards/listings/chat** —
  explicitly deferred; not part of the three surfaces prioritized.

## Files touched

New:
```
prisma/migrations_manual/0011_gamification_wiring.sql
lib/gamification/queries.ts
components/gamification/tier-badge.tsx
components/gamification/header-gamification-pill.tsx
components/gamification/user-badge-pill.tsx
components/gamification/gamification-panel.tsx
components/gamification/quest-card.tsx
app/quests/page.tsx
```

Full replacement files (overwrite existing):
```
prisma/schema.prisma
types/gamification.ts
lib/gamification/constants.ts
lib/mappers.ts
lib/wishlist.ts
lib/messages.ts
lib/ratings.ts
components/listing-form.tsx
components/profile/edit-profile-dialog.tsx
app/swaps/[id]/page.tsx
components/navbar.tsx
components/profile/profile-view.tsx
components/profile/profile-header.tsx
GAMIFICATION.md
README.md (this file)
```

## Setup steps

1. **Run the migration** in the Supabase SQL editor, after 0001–0010:
   `0011_gamification_wiring.sql`.
2. **Copy files in**, preserving paths (see list above).
3. **No new npm dependencies** — only new lucide-react icons, already in
   the existing dependency.
4. Restart the dev server.

## Verification

Same constraint as Batch 5 — no live Postgres/Supabase or
`binaries.prisma.sh` access in this environment:
- `npx tsc --noEmit` — clean.
- `npx next build` — clean production build, all 21 routes compiled,
  including the new `/quests` route and the modified `/profile`,
  `/profile/[username]`, and `/swaps/[id]` routes.
- `0011_gamification_wiring.sql` parsed successfully with the same
  standalone Postgres SQL parser used for Batch 5's migration. That parser
  only validates the outer SQL — the `plpgsql` function bodies (the actual
  award logic) were checked by hand, statement by statement, since nothing
  in this sandbox can execute `plpgsql` without a live Postgres server.

Worth running this against a real Supabase project — especially the four
new RPC functions — before merging, since `plpgsql` body correctness
couldn't be machine-verified here.
