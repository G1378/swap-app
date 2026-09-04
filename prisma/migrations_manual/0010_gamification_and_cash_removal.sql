-- Batch 5: Lightweight gamification + cash top-up removal.
--
-- Part 1 removes the cash_offer_cents column added in 0009 — swap-app is a
-- pure item-for-item marketplace now. No cash-for-item transactions, and no
-- cash used to balance an uneven trade, anywhere in the product.
--
-- Part 2 adds the gamification layer: a per-profile XP/level/tier/streak
-- row, an auditable Swap Points (non-cash currency) ledger, a badge catalog
-- + earned-badges join table, and a quest catalog + per-user quest
-- progress. See GAMIFICATION.md for the full design note, including where
-- leaderboard data comes from (existing tables — no new heavy tables here).
--
-- This migration is deliberately schema-only: it does NOT wire up automatic
-- XP/points awarding. See the note at the bottom of this file for the
-- natural next step.
--
-- Run this in the Supabase SQL editor after 0001-0009.

-- ---------------------------------------------------------------------------
-- 1. Remove cash top-up.
-- ---------------------------------------------------------------------------

alter table public.swap_requests drop column if exists cash_offer_cents;

-- ---------------------------------------------------------------------------
-- 2. Trader Levels, XP & Tiers — one row per profile, created automatically.
-- ---------------------------------------------------------------------------

create table if not exists public.gamification_profiles (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  tier text not null default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  points_balance integer not null default 0 check (points_balance >= 0),
  current_streak_weeks integer not null default 0 check (current_streak_weeks >= 0),
  longest_streak_weeks integer not null default 0 check (longest_streak_weeks >= 0),
  -- Monday (UTC) of the most recent week that counted toward the streak.
  last_activity_week_start date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gamification_profiles enable row level security;

-- Level/tier/streak are social-proof data (shown on profile pages and
-- leaderboards), so readable by anyone — same visibility as ratings.
create policy "Gamification profiles are viewable by everyone"
  on public.gamification_profiles for select using (true);

-- Deliberately no insert/update/delete policy for regular users here: XP,
-- tier, and points balance must never be client-writable, the same way
-- swap-request status transitions are guarded rather than left to raw
-- client writes. All changes happen server-side (service-role key, or a
-- future SECURITY DEFINER function alongside handle_swap_request_after_update
-- — see the closing note below).

drop trigger if exists set_gamification_profiles_updated_at on public.gamification_profiles;
create trigger set_gamification_profiles_updated_at
  before update on public.gamification_profiles
  for each row execute procedure public.set_updated_at();

-- Auto-provision a gamification profile the moment a profile is created, so
-- the rest of the app can assume it always exists rather than null-checking.
create or replace function public.handle_new_profile_gamification()
returns trigger as $$
begin
  insert into public.gamification_profiles (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_profile_created_gamification on public.profiles;
create trigger on_profile_created_gamification
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_gamification();

-- Backfill for profiles that already existed before this migration.
insert into public.gamification_profiles (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Swap Points — an auditable, append-only ledger. A profile's
--    points_balance should always equal the sum of its signed amounts here.
-- ---------------------------------------------------------------------------

create table if not exists public.points_transactions (
  id uuid primary key default uuid_generate_v4(),
  gamification_profile_id uuid not null references public.gamification_profiles(id) on delete cascade,
  type text not null check (type in ('earn', 'spend')),
  reason text not null check (reason in (
    'swap_completed', 'streak_milestone', 'quest_completed', 'referral',
    'featured_listing_boost', 'profile_cosmetic', 'priority_match', 'category_unlock',
    'adjustment'
  )),
  -- Always positive; `type` gives the direction.
  amount integer not null check (amount > 0),
  -- Running balance immediately after this transaction.
  balance_after integer not null check (balance_after >= 0),
  related_swap_request_id uuid references public.swap_requests(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists points_transactions_profile_idx
  on public.points_transactions (gamification_profile_id, created_at desc);

alter table public.points_transactions enable row level security;

-- Ledger history is private — only the owner sees their own transactions.
create policy "Users can view their own points ledger"
  on public.points_transactions for select
  using (
    exists (
      select 1 from public.gamification_profiles gp
      where gp.id = gamification_profile_id and gp.profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Badges — small catalog + a join table for who's earned what.
-- ---------------------------------------------------------------------------

create table if not exists public.badges (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  label text not null,
  description text not null,
  -- Lucide icon name.
  icon text not null,
  created_at timestamptz not null default now()
);

alter table public.badges enable row level security;

create policy "Badge catalog is viewable by everyone"
  on public.badges for select using (true);

create table if not exists public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  gamification_profile_id uuid not null references public.gamification_profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (gamification_profile_id, badge_id)
);

alter table public.user_badges enable row level security;

-- Earned badges are shown on public profile pages, like ratings.
create policy "Earned badges are viewable by everyone"
  on public.user_badges for select using (true);

-- Starter badge catalog. This is admin-managed reference data, not code —
-- add rows here (or via a future admin tool) rather than shipping a new
-- migration for every new badge.
insert into public.badges (slug, label, description, icon) values
  ('first-swap', 'First Swap', 'Completed your first swap.', 'sparkles'),
  ('five-swaps', 'Active Swapper', 'Completed 5 swaps.', 'flame'),
  ('twenty-swaps', 'Power Swapper', 'Completed 20 swaps.', 'trophy'),
  ('highly-rated', 'Highly Rated', 'Earned a 4.5+ average rating from 5 or more reviews.', 'star'),
  ('four-week-streak', 'On a Roll', 'Kept a 4-week activity streak going.', 'flame'),
  ('community-builder', 'Community Builder', 'Brought in 3 successful referrals.', 'sparkles')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Quests — small catalog + per-user, per-period progress.
-- ---------------------------------------------------------------------------

create table if not exists public.quests (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  description text not null,
  cadence text not null default 'weekly' check (cadence in ('weekly', 'seasonal')),
  -- Optional launch-category tie-in for seasonal quests (e.g. "Gaming").
  -- Free-text, matching LISTING_CATEGORIES in lib/constants.ts — no FK
  -- since categories aren't their own table.
  category text,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  points_reward integer not null default 0 check (points_reward >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.quests enable row level security;

create policy "Quest catalog is viewable by everyone"
  on public.quests for select using (true);

create table if not exists public.user_quest_progress (
  id uuid primary key default uuid_generate_v4(),
  gamification_profile_id uuid not null references public.gamification_profiles(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  progress_count integer not null default 0 check (progress_count >= 0),
  target_count integer not null default 1 check (target_count >= 1),
  -- Start (Monday, UTC) of the week/season this instance belongs to — lets
  -- the same quest rotate back in a later period as a fresh row.
  period_start date not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (gamification_profile_id, quest_id, period_start)
);

create index if not exists user_quest_progress_profile_idx
  on public.user_quest_progress (gamification_profile_id, period_start desc);

alter table public.user_quest_progress enable row level security;

-- Quest progress is personal to-do state — private to its owner (unlike
-- badges/ratings, there's no leaderboard-style reason to expose it).
create policy "Users can view their own quest progress"
  on public.user_quest_progress for select
  using (
    exists (
      select 1 from public.gamification_profiles gp
      where gp.id = gamification_profile_id and gp.profile_id = auth.uid()
    )
  );

-- Starter quest pool. The app rotates 3 of the "weekly" rows in per user
-- per week; seasonal rows are optional extras tied to a launch category.
insert into public.quests (slug, title, description, cadence, category, xp_reward, points_reward) values
  ('list-an-item', 'List a new item', 'Create one new listing.', 'weekly', null, 10, 10),
  ('reply-to-a-match', 'Reply to a match', 'Send a message in an active swap conversation.', 'weekly', null, 10, 10),
  ('complete-a-swap', 'Complete a swap', 'Finish a swap from start to finish.', 'weekly', null, 20, 15),
  ('update-your-wishlist', 'Update your wishlist', 'Add an item to your wishlist.', 'weekly', null, 5, 5),
  ('leave-a-rating', 'Leave a rating', 'Rate a completed swap.', 'weekly', null, 10, 10),
  ('gaming-season-swap', 'Swap in Gaming', 'Complete a swap in the Gaming category.', 'seasonal', 'Gaming', 20, 20),
  ('lego-season-swap', 'Swap in LEGO', 'Complete a swap in the LEGO category.', 'seasonal', 'LEGO', 20, 20),
  ('camera-season-swap', 'Swap in Camera Equipment', 'Complete a swap in the Camera Equipment category.', 'seasonal', 'Camera Equipment', 20, 20),
  ('instruments-season-swap', 'Swap in Musical Instruments', 'Complete a swap in the Musical Instruments category.', 'seasonal', 'Musical Instruments', 20, 20),
  ('pc-season-swap', 'Swap in PC Components', 'Complete a swap in the PC Components category.', 'seasonal', 'PC Components', 20, 20)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Note: this migration is schema-only and does not award XP/points
-- automatically yet. The natural hook point for that is
-- `handle_swap_request_after_update()` in 0009_swap_bundles_and_counters.sql
-- — the `elsif new.status = 'completed' then` branch already fires exactly
-- when both sides confirm. A follow-up migration can extend it to also
-- upsert xp/points_balance and insert a points_transactions row there.
-- It's left out of this batch on purpose: that function is delicate and
-- already shipped, and streak/quest-progress bookkeeping needs "what week
-- is it" logic that's easier to get right in application code (or a
-- dedicated scheduled job) than inside a row-level trigger.
-- ---------------------------------------------------------------------------
