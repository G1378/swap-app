-- Discover feed feedback: "not interested" passes, an append-only event log,
-- and a paginated feed function that respects both.
-- Run this in the Supabase SQL editor after 0001-0013.
--
-- Note: two files are numbered 0013 (0013_allow_counter_offers... and
-- 0013_two_sided_counters...). This migration doesn't depend on either
-- beyond the tables they share with earlier migrations, but confirm both
-- were applied before running it.

-- ---------------------------------------------------------------------------
-- 1. Passes. A row means "this user swiped left on this listing" — the
--    listing never appears in that user's Discover feed again. Private to
--    the passing user: owners can't see who passed on their listing.
--
--    `reason` is optional and collected after the swipe (a one-tap chip),
--    so it's updated separately from the insert. It is stored now and will
--    feed ranking later; nothing reads it yet.
-- ---------------------------------------------------------------------------

create table if not exists public.listing_passes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  reason text check (reason in ('wrong_category', 'not_my_style', 'too_far', 'already_seen')),
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index if not exists listing_passes_user_created_idx
  on public.listing_passes (user_id, created_at desc);

alter table public.listing_passes enable row level security;

create policy "Users can view their own passes"
  on public.listing_passes for select using (auth.uid() = user_id);

create policy "Users can pass on listings as themselves"
  on public.listing_passes for insert with check (auth.uid() = user_id);

create policy "Users can update the reason on their own passes"
  on public.listing_passes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Deleting a pass is how "Undo" (and a future "Passed items" screen) works.
create policy "Users can remove their own passes"
  on public.listing_passes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Event log. Append-only from the client's point of view: users can
--    insert and read their own rows, but there are deliberately no update
--    or delete policies. This is the raw material for ranking work later
--    (dwell time, what got opened, what led to a swap request).
--
--    event_type:
--      impression   - a card was on screen; dwell_ms is how long
--      info_open    - opened the full listing page from a card
--      swap_started - opened the swap builder from a card
--      pass         - swiped left / tapped "Not interested"
--
--    Rows are per-user behavioural data. Plan a retention job (e.g. prune
--    rows older than 90 days) before this table gets large.
-- ---------------------------------------------------------------------------

create table if not exists public.listing_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'info_open', 'swap_started', 'pass')),
  dwell_ms integer check (dwell_ms is null or (dwell_ms >= 0 and dwell_ms <= 300000)),
  position integer check (position is null or position >= 0),
  created_at timestamptz not null default now()
);

create index if not exists listing_events_user_created_idx
  on public.listing_events (user_id, created_at desc);

create index if not exists listing_events_listing_type_idx
  on public.listing_events (listing_id, event_type);

alter table public.listing_events enable row level security;

create policy "Users can view their own listing events"
  on public.listing_events for select using (auth.uid() = user_id);

create policy "Users can log listing events as themselves"
  on public.listing_events for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Indexes for the feed query. The listings table had none.
-- ---------------------------------------------------------------------------

create index if not exists listings_available_created_idx
  on public.listings (created_at desc, id desc)
  where status = 'available';

create index if not exists listings_owner_status_idx
  on public.listings (owner_id, status);

-- ---------------------------------------------------------------------------
-- 4. The Discover feed.
--
--    Candidates: available listings that aren't the viewer's own, aren't
--    from someone they have a block with (either direction), and haven't
--    been passed on. Ordering:
--      1. Listings from owners who have saved one of the viewer's available
--         listings come first (a likely-to-accept signal).
--      2. Then newest first.
--
--    SECURITY DEFINER because wishlist_items is only readable by its own
--    owner under RLS, and step 1 has to look at other people's wishlists.
--    That's safe here because the function only ever returns listing rows
--    (already public), never wishlist rows — the only thing a caller can
--    infer is a slightly different ordering. The viewer is always
--    auth.uid(); it is never a parameter, so nobody can ask for someone
--    else's feed. Logged-out callers get newest-first with no filtering.
--
--    p_exclude_ids lets the client page forward without offsets: it sends
--    the ids it has already loaded and gets the next batch of the rest.
--    Offset paging would skip items whenever a card is passed mid-session.
-- ---------------------------------------------------------------------------

create or replace function public.get_discover_feed(
  p_limit int default 20,
  p_exclude_ids uuid[] default '{}'
)
returns setof public.listings
language sql
stable
security definer
set search_path = public
as $$
  with interested_owners as (
    select distinct w.profile_id as owner_id
    from public.wishlist_items w
    join public.listings mine on mine.id = w.listing_id
    where auth.uid() is not null
      and mine.owner_id = auth.uid()
      and mine.status = 'available'
  )
  select l.*
  from public.listings l
  where l.status = 'available'
    and (auth.uid() is null or l.owner_id <> auth.uid())
    and l.id <> all (coalesce(p_exclude_ids, '{}'::uuid[]))
    and (
      auth.uid() is null
      or (
        not public.blocked_between(auth.uid(), l.owner_id)
        and not exists (
          select 1
          from public.listing_passes p
          where p.user_id = auth.uid()
            and p.listing_id = l.id
        )
      )
    )
  order by
    case when l.owner_id in (select owner_id from interested_owners) then 0 else 1 end,
    l.created_at desc,
    l.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.get_discover_feed(int, uuid[]) from public;
grant execute on function public.get_discover_feed(int, uuid[]) to anon, authenticated;
