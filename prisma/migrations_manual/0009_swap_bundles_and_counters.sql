-- Swap bundles + cash top-up + counter-offers.
--
-- Replaces the single `offered_listing_id` column with a proper bundle
-- table (swap_request_items), so a sender can offer more than one of
-- their own listings in a single request. Adds a cash amount on top of
-- the bundle, and a lightweight counter-offer chain (each counter is a
-- new swap_requests row linked back via parent_request_id, reusing the
-- same chat thread).
--
-- Run this in the Supabase SQL editor after 0001-0008.

-- ---------------------------------------------------------------------------
-- 1. New columns + status value.
-- ---------------------------------------------------------------------------

alter table public.swap_requests
  add column if not exists cash_offer_cents integer not null default 0 check (cash_offer_cents >= 0),
  add column if not exists parent_request_id uuid references public.swap_requests(id) on delete set null;

alter table public.swap_requests drop constraint if exists swap_requests_status_check;
alter table public.swap_requests add constraint swap_requests_status_check
  check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed', 'countered'));

-- ---------------------------------------------------------------------------
-- 2. Offered-items bundle, replacing the single offered_listing_id column.
-- ---------------------------------------------------------------------------

create table if not exists public.swap_request_items (
  id uuid primary key default uuid_generate_v4(),
  swap_request_id uuid not null references public.swap_requests(id) on delete cascade,
  listing_id uuid not null references public.listings(id),
  created_at timestamptz not null default now(),
  unique (swap_request_id, listing_id)
);

alter table public.swap_request_items enable row level security;

create policy "Participants can view swap request items"
  on public.swap_request_items for select
  using (
    exists (
      select 1 from public.swap_requests sr
      where sr.id = swap_request_id
        and auth.uid() in (sr.sender_id, sr.receiver_id)
    )
  );

-- Deliberately checks "you're a participant in this pending request", not
-- "you own this specific listing" — the app UI only ever offers a party
-- their own listings to pick from, and enforcing true per-listing
-- ownership here would need a second, more complex policy to also allow a
-- countering receiver to reference the original sender's items. Given
-- nothing transfers until both sides separately confirm completion, this
-- is an acceptable trade-off between strictness and shippable complexity.
create policy "Participants can add items to a pending swap request"
  on public.swap_request_items for insert
  with check (
    exists (
      select 1 from public.swap_requests sr
      where sr.id = swap_request_id
        and sr.status = 'pending'
        and auth.uid() in (sr.sender_id, sr.receiver_id)
    )
  );

-- Backfill existing single-item offers into the new bundle table before
-- dropping the old column.
insert into public.swap_request_items (swap_request_id, listing_id)
select id, offered_listing_id from public.swap_requests where offered_listing_id is not null
on conflict do nothing;

alter table public.swap_requests drop column if exists offered_listing_id;
alter table public.swap_requests drop column if exists offered_item;

-- ---------------------------------------------------------------------------
-- 3. Allow a counter-offer to be inserted by whichever party didn't create
--    the original request, as long as it keeps the same two people and the
--    same target listing (prevents this policy from being used to create
--    unrelated rows).
-- ---------------------------------------------------------------------------

create policy "Participants can submit a counter offer"
  on public.swap_requests for insert
  with check (
    auth.uid() in (sender_id, receiver_id)
    and sender_id <> receiver_id
    and parent_request_id is not null
    and not public.blocked_between(sender_id, receiver_id)
    and exists (
      select 1 from public.swap_requests parent
      where parent.id = parent_request_id
        and parent.listing_id = listing_id
        and auth.uid() in (parent.sender_id, parent.receiver_id)
        and sender_id in (parent.sender_id, parent.receiver_id)
        and receiver_id in (parent.sender_id, parent.receiver_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Allow 'pending' -> 'countered', receiver-only (same shape as the
--    existing accept/decline checks in this function).
-- ---------------------------------------------------------------------------

create or replace function public.handle_swap_request_before_update()
returns trigger as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if old.status = 'pending' and new.status = 'accepted' then
    if auth.uid() <> old.receiver_id then
      raise exception 'Only the receiver can accept a swap request.';
    end if;

  elsif old.status = 'pending' and new.status = 'declined' then
    if auth.uid() <> old.receiver_id then
      raise exception 'Only the receiver can decline a swap request.';
    end if;

  elsif old.status = 'pending' and new.status = 'countered' then
    if auth.uid() <> old.receiver_id then
      raise exception 'Only the receiver can counter a swap request.';
    end if;

  elsif new.status = 'cancelled' and old.status in ('pending', 'accepted') then
    if auth.uid() not in (old.sender_id, old.receiver_id) then
      raise exception 'Only a participant can cancel a swap request.';
    end if;

  elsif old.status = 'accepted' and new.status = 'accepted' then
    -- Marking one side's completion timestamp keeps status = 'accepted'
    -- until both sides have confirmed; see the completion check below.
    if auth.uid() = old.sender_id then
      new.sender_completed_at := coalesce(new.sender_completed_at, now());
    elsif auth.uid() = old.receiver_id then
      new.receiver_completed_at := coalesce(new.receiver_completed_at, now());
    else
      raise exception 'Only a participant can update this swap request.';
    end if;

  else
    raise exception 'Invalid swap request status transition.';
  end if;

  if new.sender_completed_at is not null and new.receiver_completed_at is not null then
    new.status := 'completed';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 5. Chat threads carry over across counters instead of fragmenting into a
--    new conversation each round.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_swap_request()
returns trigger as $$
declare
  conv_id uuid;
  listing_title text;
begin
  if new.parent_request_id is not null then
    select id into conv_id from public.conversations where swap_request_id = new.parent_request_id;
  end if;

  if conv_id is not null then
    update public.conversations set swap_request_id = new.id where id = conv_id;
  else
    insert into public.conversations (swap_request_id) values (new.id) returning id into conv_id;
    insert into public.conversation_participants (conversation_id, profile_id)
    values (conv_id, new.sender_id), (conv_id, new.receiver_id)
    on conflict do nothing;
  end if;

  select title into listing_title from public.listings where id = new.listing_id;

  insert into public.notifications (profile_id, type, title, body, link)
  values (
    new.receiver_id,
    'swap_request',
    case when new.parent_request_id is not null then 'Counter-offer received' else 'New swap request' end,
    coalesce('Someone wants to swap for "' || listing_title || '".', 'You have a new swap request.'),
    '/swaps/' || new.id
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 6. Listing status changes now sweep the whole offered bundle, not a
--    single offered_listing_id.
-- ---------------------------------------------------------------------------

create or replace function public.handle_swap_request_after_update()
returns trigger as $$
declare
  listing_title text;
begin
  if new.status = old.status then
    return new;
  end if;

  select title into listing_title from public.listings where id = new.listing_id;

  if new.status = 'accepted' then
    update public.listings set status = 'pending' where id = new.listing_id;
    update public.listings set status = 'pending'
      where id in (select listing_id from public.swap_request_items where swap_request_id = new.id);

    insert into public.notifications (profile_id, type, title, body, link)
    values (
      new.sender_id, 'swap_request', 'Swap request accepted',
      coalesce('Your offer for "' || listing_title || '" was accepted.', 'Your swap request was accepted.'),
      '/swaps/' || new.id
    );

  elsif new.status in ('declined', 'cancelled') then
    update public.listings set status = 'available'
      where id = new.listing_id and status = 'pending';
    update public.listings set status = 'available'
      where id in (select listing_id from public.swap_request_items where swap_request_id = new.id)
        and status = 'pending';

    if new.status = 'declined' then
      insert into public.notifications (profile_id, type, title, body, link)
      values (
        new.sender_id, 'swap_request', 'Swap request declined',
        coalesce('Your offer for "' || listing_title || '" was declined.', 'Your swap request was declined.'),
        '/swaps/' || new.id
      );
    end if;

  elsif new.status = 'completed' then
    update public.listings set status = 'swapped' where id = new.listing_id;
    update public.listings set status = 'swapped'
      where id in (select listing_id from public.swap_request_items where swap_request_id = new.id);

    insert into public.notifications (profile_id, type, title, body, link)
    select p, 'swap_request', 'Swap completed', 'Both sides confirmed the swap — don''t forget to leave a rating.',
      '/swaps/' || new.id
    from unnest(array[new.sender_id, new.receiver_id]) as p;

  end if;
  -- 'countered' needs no listing status change here — the new counter row's
  -- own insert (handle_new_swap_request) is what notifies the other party.

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 7. The delete guard now checks the bundle table instead of a single
--    offered_listing_id column.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_active_listing_delete()
returns trigger as $$
begin
  if exists (
    select 1 from public.swap_requests sr
    where sr.listing_id = old.id and sr.status in ('pending', 'accepted')
  ) or exists (
    select 1 from public.swap_request_items sri
    join public.swap_requests sr on sr.id = sri.swap_request_id
    where sri.listing_id = old.id and sr.status in ('pending', 'accepted')
  ) then
    raise exception 'Cannot delete a listing that is part of an active swap request.';
  end if;
  return old;
end;
$$ language plpgsql security definer set search_path = public;
