-- Discover feed, phase 2: match candidates against what the viewer's own
-- listings say they want, and vice versa, using Postgres's pg_trgm
-- extension for fuzzy text matching. Builds on 0014 (passes, events,
-- wishlist-priority ranking) — run this after it.
--
-- Two scores, computed per candidate against the viewer's own available
-- listings:
--   want_score   - does this candidate look like something the viewer
--                  asked for on one of their own listings? Compares the
--                  candidate's "category + title" against each of the
--                  viewer's listings' wanted_in_return, keeps the best.
--   accept_score - does the viewer already own something this candidate's
--                  owner is asking for? Compares each of the viewer's
--                  listings' "category + title" against the candidate's
--                  wanted_in_return, keeps the best.
-- Both are pg_trgm similarity scores, 0 (no lexical overlap) to 1
-- (identical text). This catches "PS5" vs "PS5 console" and "Nintendo
-- Switch" vs "Switch OLED", but not synonyms or semantic matches ("wide-
-- angle lens" vs "16mm f/1.4") — that needs embeddings, not trigrams, and
-- is a later phase, not this one.
--
-- accept_score is weighted higher than want_score in the combined
-- ranking: a listing the viewer would love from an owner who wants
-- nothing they own is a dead end (see the original brainstorm) — a
-- listing that's a so-so want but a clear accept is more likely to become
-- a completed swap.

create extension if not exists pg_trgm;

-- Not required for the per-viewer scoring below (the viewer's own listing
-- count is small enough that pg_trgm's index-accelerated `%` operator
-- doesn't matter yet — this is a plain nested-loop over a handful of
-- rows), but useful groundwork for scaling free-text listing search later
-- without another migration.
create index if not exists listings_wanted_in_return_trgm_idx
  on public.listings using gin (wanted_in_return gin_trgm_ops);

create index if not exists listings_title_trgm_idx
  on public.listings using gin (title gin_trgm_ops);

-- The return shape is changing (adding score columns), and Postgres
-- doesn't allow CREATE OR REPLACE to change a function's return type —
-- it has to be dropped first.
drop function if exists public.get_discover_feed(int, uuid[]);

create or replace function public.get_discover_feed(
  p_limit int default 20,
  p_exclude_ids uuid[] default '{}'
)
returns table (
  id uuid,
  owner_id uuid,
  title text,
  description text,
  category text,
  condition text,
  image_url text,
  wanted_in_return text,
  status text,
  created_at timestamptz,
  owner_wishlisted_mine boolean,
  want_score real,
  accept_score real
)
language sql
stable
security definer
set search_path = public
as $$
  with my_listings as (
    select m.id, m.title, m.category, m.wanted_in_return
    from public.listings m
    where auth.uid() is not null
      and m.owner_id = auth.uid()
      and m.status = 'available'
  ),
  interested_owners as (
    select distinct w.profile_id as owner_id
    from public.wishlist_items w
    join my_listings mine on mine.id = w.listing_id
  ),
  -- Filtering (status/self/exclude/blocked/passed) happens before scoring,
  -- same as 0014 — scoring an already-filtered set keeps this cheap. If
  -- the catalogue grows large enough for this full scan to matter, cap
  -- this CTE (e.g. the most recent N) before scoring rather than after.
  candidates as (
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
  ),
  scored as (
    select
      c.*,
      (c.owner_id in (select owner_id from interested_owners)) as owner_wishlisted_mine,
      coalesce((
        select max(similarity(c.category || ' ' || c.title, m.wanted_in_return))
        from my_listings m
      ), 0)::real as want_score,
      coalesce((
        select max(similarity(m.category || ' ' || m.title, c.wanted_in_return))
        from my_listings m
      ), 0)::real as accept_score
    from candidates c
  )
  select
    id, owner_id, title, description, category, condition, image_url,
    wanted_in_return, status, created_at,
    owner_wishlisted_mine, want_score, accept_score
  from scored
  order by
    case when owner_wishlisted_mine then 0 else 1 end,
    (0.6 * accept_score + 0.4 * want_score) desc,
    created_at desc,
    id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.get_discover_feed(int, uuid[]) from public;
grant execute on function public.get_discover_feed(int, uuid[]) to anon, authenticated;
