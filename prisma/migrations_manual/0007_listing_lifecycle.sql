-- Listing lifecycle: a guard against deleting a listing mid-swap (deleting
-- a listing cascades to its swap_requests rows, which would silently blow
-- away the other party's negotiation), plus a proper photo gallery table.
-- Run this in the Supabase SQL editor after 0001-0006.

-- ---------------------------------------------------------------------------
-- 1. Block deleting a listing that's part of an active (pending/accepted)
--    swap, whether as the listing being requested or as the offered item.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_active_listing_delete()
returns trigger as $$
begin
  if exists (
    select 1 from public.swap_requests
    where (listing_id = old.id or offered_listing_id = old.id)
      and status in ('pending', 'accepted')
  ) then
    raise exception 'Cannot delete a listing that is part of an active swap request.';
  end if;
  return old;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_listing_delete on public.listings;
create trigger before_listing_delete
  before delete on public.listings
  for each row execute procedure public.prevent_active_listing_delete();

-- ---------------------------------------------------------------------------
-- 2. Photo gallery. `listings.image_url` stays the cover photo (every
--    existing consumer of Listing.imageUrl keeps working unchanged); this
--    table holds up to a handful of additional photos per listing.
-- ---------------------------------------------------------------------------

create table if not exists public.listing_photos (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.listing_photos enable row level security;

create policy "Listing photos are publicly viewable"
  on public.listing_photos for select using (true);

create policy "Owners can add photos to their own listings"
  on public.listing_photos for insert
  with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  );

create policy "Owners can remove photos from their own listings"
  on public.listing_photos for delete
  using (
    exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  );
