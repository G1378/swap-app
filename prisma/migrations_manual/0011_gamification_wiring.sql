-- Batch 6: wire up the gamification layer so it actually moves.
--
-- 0010 shipped schema only, deliberately, because gamification_profiles has
-- no client-writable columns (see its RLS comment) — XP/points can only
-- change through a validated, server-side path. This migration adds that
-- path as a handful of small SECURITY DEFINER functions, called via
-- `supabase.rpc(...)` from lib/gamification/queries.ts. This is the first
-- use of `.rpc()` in this app; everything else so far has been plain
-- `.from()` calls guarded by RLS.
--
-- Each function is independently idempotent/self-guarding (safe to call
-- more than once, a no-op if the caller isn't eligible) rather than relying
-- on the caller to only call it at the "right" moment.
--
-- IMPORTANT — keep these in sync with lib/gamification/constants.ts:
-- the XP/points amounts below are duplicated from that file (50/20 for a
-- completed swap, 20 for profile completion, and the per-quest xp_reward/
-- points_reward already live in the `quests` table itself). There's no
-- shared source of truth across SQL and TypeScript here — if you retune
-- XP_AWARDS or POINTS_AWARDS, update the matching literal below too.
--
-- Run this in the Supabase SQL editor after 0001-0010.

-- ---------------------------------------------------------------------------
-- 1. One-time bonus tracking + level/tier helpers.
-- ---------------------------------------------------------------------------

alter table public.gamification_profiles
  add column if not exists profile_completed_bonus_awarded boolean not null default false;

-- Mirrors LEVEL_XP_THRESHOLDS in lib/gamification/constants.ts.
create or replace function public.gamification_level_for_xp(p_xp integer)
returns integer
language sql
immutable
as $$
  select case
    when p_xp >= 5000 then 10
    when p_xp >= 3800 then 9
    when p_xp >= 2800 then 8
    when p_xp >= 2000 then 7
    when p_xp >= 1400 then 6
    when p_xp >= 900  then 5
    when p_xp >= 500  then 4
    when p_xp >= 250  then 3
    when p_xp >= 100  then 2
    else 1
  end;
$$;

-- Mirrors TIER_LEVEL_FLOORS in lib/gamification/constants.ts.
create or replace function public.gamification_tier_for_level(p_level integer)
returns text
language sql
immutable
as $$
  select case
    when p_level >= 10 then 'platinum'
    when p_level >= 7  then 'gold'
    when p_level >= 4  then 'silver'
    else 'bronze'
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Swap completion reward — the core loop. +50 XP, +20 points, once per
--    participant per swap.
-- ---------------------------------------------------------------------------

create or replace function public.claim_swap_completion_reward(p_swap_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_swap record;
  v_gp record;
  v_new_xp integer;
  v_new_points integer;
begin
  if v_profile_id is null then
    return;
  end if;

  select status, sender_id, receiver_id into v_swap
  from public.swap_requests
  where id = p_swap_request_id;

  -- Silently no-op on anything that isn't a legitimate claim: wrong swap,
  -- not completed yet, or the caller isn't a participant. The client calls
  -- this optimistically on every view of a completed swap, so "nothing to
  -- do" is an expected, ordinary outcome, not an error.
  if not found or v_swap.status <> 'completed' then
    return;
  end if;
  if v_profile_id <> v_swap.sender_id and v_profile_id <> v_swap.receiver_id then
    return;
  end if;

  select * into v_gp from public.gamification_profiles where profile_id = v_profile_id for update;
  if not found then
    return;
  end if;

  -- Idempotency guard: a swap_completed ledger row for this swap already
  -- existing means this participant already claimed it.
  if exists (
    select 1 from public.points_transactions
    where gamification_profile_id = v_gp.id
      and reason = 'swap_completed'
      and related_swap_request_id = p_swap_request_id
  ) then
    return;
  end if;

  v_new_xp := v_gp.xp + 50;
  v_new_points := v_gp.points_balance + 20;

  update public.gamification_profiles
  set xp = v_new_xp,
      level = public.gamification_level_for_xp(v_new_xp),
      tier = public.gamification_tier_for_level(public.gamification_level_for_xp(v_new_xp)),
      points_balance = v_new_points
  where id = v_gp.id;

  insert into public.points_transactions
    (gamification_profile_id, type, reason, amount, balance_after, related_swap_request_id)
  values
    (v_gp.id, 'earn', 'swap_completed', 20, v_new_points, p_swap_request_id);
end;
$$;

grant execute on function public.claim_swap_completion_reward(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Profile completion reward — one-time +20 XP, no points (not in the
--    spec's points-earning list). Piggybacks on the existing
--    profiles.onboarding_completed flag rather than re-deriving
--    "complete" from individual fields.
-- ---------------------------------------------------------------------------

create or replace function public.claim_profile_completion_reward()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_onboarded boolean;
  v_gp record;
  v_new_xp integer;
begin
  if v_profile_id is null then
    return;
  end if;

  select onboarding_completed into v_onboarded from public.profiles where id = v_profile_id;
  if not found or not v_onboarded then
    return;
  end if;

  select * into v_gp from public.gamification_profiles where profile_id = v_profile_id for update;
  if not found or v_gp.profile_completed_bonus_awarded then
    return;
  end if;

  v_new_xp := v_gp.xp + 20;

  update public.gamification_profiles
  set xp = v_new_xp,
      level = public.gamification_level_for_xp(v_new_xp),
      tier = public.gamification_tier_for_level(public.gamification_level_for_xp(v_new_xp)),
      profile_completed_bonus_awarded = true
  where id = v_gp.id;
end;
$$;

grant execute on function public.claim_profile_completion_reward() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Quest board provisioning + progress. Weekly quests rotate 3-of-5,
--    round-robin by week — deterministic, no stored "assignment" needed.
--    Seasonal quests use the current calendar month as a stand-in for a
--    real "season" concept.
-- ---------------------------------------------------------------------------

create or replace function public.refresh_quest_board()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_gp_id uuid;
  v_week_start date;
  v_week_index integer;
  v_start_idx integer;
  -- Keep this order in sync with the weekly quest slugs seeded in
  -- 0010_gamification_and_cash_removal.sql.
  v_weekly_slugs text[] := array[
    'list-an-item', 'reply-to-a-match', 'complete-a-swap',
    'update-your-wishlist', 'leave-a-rating'
  ];
  v_active_slugs text[];
  v_season_start date;
begin
  if v_profile_id is null then
    return;
  end if;

  select id into v_gp_id from public.gamification_profiles where profile_id = v_profile_id;
  if v_gp_id is null then
    return;
  end if;

  v_week_start := date_trunc('week', current_date)::date;
  v_week_index := (v_week_start - date '2024-01-01') / 7;
  v_start_idx := v_week_index % 5;

  -- Postgres arrays are 1-indexed.
  v_active_slugs := array[
    v_weekly_slugs[v_start_idx + 1],
    v_weekly_slugs[((v_start_idx + 1) % 5) + 1],
    v_weekly_slugs[((v_start_idx + 2) % 5) + 1]
  ];

  insert into public.user_quest_progress (gamification_profile_id, quest_id, period_start)
  select v_gp_id, q.id, v_week_start
  from public.quests q
  where q.cadence = 'weekly' and q.is_active and q.slug = any(v_active_slugs)
  on conflict (gamification_profile_id, quest_id, period_start) do nothing;

  v_season_start := date_trunc('month', current_date)::date;

  insert into public.user_quest_progress (gamification_profile_id, quest_id, period_start)
  select v_gp_id, q.id, v_season_start
  from public.quests q
  where q.cadence = 'seasonal' and q.is_active
  on conflict (gamification_profile_id, quest_id, period_start) do nothing;
end;
$$;

grant execute on function public.refresh_quest_board() to authenticated;

create or replace function public.bump_quest_progress(p_quest_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_gp record;
  v_quest record;
  v_period_start date;
  v_progress record;
  v_new_count integer;
  v_new_xp integer;
  v_new_points integer;
begin
  if v_profile_id is null then
    return;
  end if;

  select * into v_gp from public.gamification_profiles where profile_id = v_profile_id for update;
  if not found then
    return;
  end if;

  select * into v_quest from public.quests where slug = p_quest_slug and is_active;
  if not found then
    return;
  end if;

  v_period_start := case v_quest.cadence
    when 'weekly' then date_trunc('week', current_date)::date
    else date_trunc('month', current_date)::date
  end;

  select * into v_progress
  from public.user_quest_progress
  where gamification_profile_id = v_gp.id
    and quest_id = v_quest.id
    and period_start = v_period_start
    and status = 'in_progress'
  for update;

  -- No row = this quest isn't on the caller's board this period — either
  -- refresh_quest_board() hasn't run yet (they haven't opened the Quests
  -- screen this period), or, for weekly quests, it's simply not one of
  -- this week's rotated-in 3. Either way this is a normal, silent no-op:
  -- the action itself (listing/message/swap/etc.) already succeeded on its
  -- own merits before this was called.
  if not found then
    return;
  end if;

  v_new_count := least(v_progress.progress_count + 1, v_progress.target_count);

  if v_new_count >= v_progress.target_count then
    update public.user_quest_progress
    set progress_count = v_new_count, status = 'completed', completed_at = now()
    where id = v_progress.id;

    v_new_xp := v_gp.xp + v_quest.xp_reward;
    v_new_points := v_gp.points_balance + v_quest.points_reward;

    update public.gamification_profiles
    set xp = v_new_xp,
        level = public.gamification_level_for_xp(v_new_xp),
        tier = public.gamification_tier_for_level(public.gamification_level_for_xp(v_new_xp)),
        points_balance = v_new_points
    where id = v_gp.id;

    if v_quest.points_reward > 0 then
      insert into public.points_transactions
        (gamification_profile_id, type, reason, amount, balance_after, note)
      values
        (v_gp.id, 'earn', 'quest_completed', v_quest.points_reward, v_new_points, 'Quest: ' || v_quest.title);
    end if;
  else
    update public.user_quest_progress
    set progress_count = v_new_count
    where id = v_progress.id;
  end if;
end;
$$;

grant execute on function public.bump_quest_progress(text) to authenticated;
