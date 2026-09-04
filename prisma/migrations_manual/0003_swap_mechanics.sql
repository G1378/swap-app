-- Swap mechanics: request → chat → accept/decline/cancel → complete → rate
-- Run this in the Supabase SQL editor after 0001_init.sql and 0002_storage.sql.
--
-- This migration:
--   1. Extends `swap_requests` with an offered listing + two-sided completion
--      confirmation.
--   2. Creates `conversations` / `conversation_participants` / `messages`
--      for in-app negotiation.
--   3. Adds trigger functions that:
--        - auto-create a conversation whenever a swap request is created
--        - enforce the swap request state machine (who can do what, when)
--        - keep `listings.status` in sync with the swap lifecycle
--        - create `notifications` rows for the relevant events
--   4. Ties `ratings` to the swap they came from and validates them.
--
-- All trigger functions that need to write to tables the current user
-- wouldn't otherwise have access to (e.g. inserting a notification for the
-- *other* participant) are declared `security definer` with a pinned
-- `search_path`, which is the safe pattern for privileged trigger logic in
-- Postgres/Supabase.

-- ---------------------------------------------------------------------------
-- 1. swap_requests: offered listing + completion tracking
-- ---------------------------------------------------------------------------

alter table public.swap_requests
  add column if not exists offered_listing_id uuid references public.listings(id) on delete set null,
  add column if not exists sender_completed_at timestamptz,
  add column if not exists receiver_completed_at timestamptz;

create index if not exists swap_requests_offered_listing_id_idx
  on public.swap_requests (offered_listing_id);

create index if not exists swap_requests_status_idx
  on public.swap_requests (status);

-- A sender can only have one active (pending/accepted) request per listing,
-- so they can't spam the same owner with duplicate offers.
create unique index if not exists swap_requests_active_sender_listing_idx
  on public.swap_requests (listing_id, sender_id)
  where status in ('pending', 'accepted');

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_swap_requests_updated_at on public.swap_requests;
create trigger set_swap_requests_updated_at
  before update on public.swap_requests
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Conversations & messages
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  swap_request_id uuid unique references public.swap_requests(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create table if not exists public.conversation_participants (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  unique (conversation_id, profile_id)
);

alter table public.conversation_participants enable row level security;

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx
  on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

-- Helper used by every messaging RLS policy below.
create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv_id and profile_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

create policy "Participants can view their conversations"
  on public.conversations for select
  using (public.is_conversation_participant(id));

create policy "Participants can view conversation participants"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id));

create policy "Participants can view their messages"
  on public.messages for select
  using (public.is_conversation_participant(conversation_id));

create policy "Participants can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

-- Enable Supabase Realtime for live chat updates.
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------
-- 3. Swap request lifecycle triggers
-- ---------------------------------------------------------------------------

-- Creating a swap request auto-creates its conversation (+ participants)
-- and notifies the listing owner.
create or replace function public.handle_new_swap_request()
returns trigger as $$
declare
  conv_id uuid;
  listing_title text;
begin
  insert into public.conversations (swap_request_id) values (new.id) returning id into conv_id;

  insert into public.conversation_participants (conversation_id, profile_id)
  values (conv_id, new.sender_id), (conv_id, new.receiver_id);

  select title into listing_title from public.listings where id = new.listing_id;

  insert into public.notifications (profile_id, type, title, body)
  values (
    new.receiver_id,
    'swap_request',
    'New swap request',
    coalesce('Someone wants to swap for "' || listing_title || '".', 'You have a new swap request.')
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_swap_request_created on public.swap_requests;
create trigger on_swap_request_created
  after insert on public.swap_requests
  for each row execute procedure public.handle_new_swap_request();

-- Enforces the state machine:
--   pending   -> accepted   (receiver only)
--   pending   -> declined   (receiver only)
--   pending   -> cancelled  (sender or receiver)
--   accepted  -> cancelled  (sender or receiver)
--   accepted  -> completed  (automatic, once both completion flags are set)
-- Completion flags can only be set by their owning participant, and only
-- while the request is accepted.
create or replace function public.handle_swap_request_before_update()
returns trigger as $$
declare
  auto_completed boolean := false;
begin
  if new.sender_completed_at is distinct from old.sender_completed_at then
    if auth.uid() <> old.sender_id then
      raise exception 'Only the sender can confirm their side of this swap.';
    end if;
    if old.status <> 'accepted' then
      raise exception 'A swap must be accepted before it can be marked complete.';
    end if;
  end if;

  if new.receiver_completed_at is distinct from old.receiver_completed_at then
    if auth.uid() <> old.receiver_id then
      raise exception 'Only the receiver can confirm their side of this swap.';
    end if;
    if old.status <> 'accepted' then
      raise exception 'A swap must be accepted before it can be marked complete.';
    end if;
  end if;

  if new.sender_completed_at is not null and new.receiver_completed_at is not null
     and old.status = 'accepted' then
    new.status := 'completed';
    auto_completed := true;
  end if;

  if new.status <> old.status then
    if new.status = 'accepted' and old.status = 'pending' then
      if auth.uid() <> old.receiver_id then
        raise exception 'Only the receiver can accept a swap request.';
      end if;
    elsif new.status = 'declined' and old.status = 'pending' then
      if auth.uid() <> old.receiver_id then
        raise exception 'Only the receiver can decline a swap request.';
      end if;
    elsif new.status = 'cancelled' and old.status in ('pending', 'accepted') then
      if auth.uid() not in (old.sender_id, old.receiver_id) then
        raise exception 'Only a participant can cancel a swap request.';
      end if;
    elsif new.status = 'completed' and auto_completed then
      null; -- only reachable automatically, never set directly by a client
    else
      raise exception 'Invalid swap request status transition from % to %.', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_swap_request_update on public.swap_requests;
create trigger before_swap_request_update
  before update on public.swap_requests
  for each row execute procedure public.handle_swap_request_before_update();

-- Once a status change has actually been committed, sync listing
-- availability and notify the relevant participant(s).
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
    if new.offered_listing_id is not null then
      update public.listings set status = 'pending' where id = new.offered_listing_id;
    end if;

    insert into public.notifications (profile_id, type, title, body)
    values (
      new.sender_id, 'swap_request', 'Swap request accepted',
      coalesce('Your offer for "' || listing_title || '" was accepted.', 'Your swap request was accepted.')
    );

  elsif new.status in ('declined', 'cancelled') then
    update public.listings set status = 'available'
      where id = new.listing_id and status = 'pending';
    if new.offered_listing_id is not null then
      update public.listings set status = 'available'
        where id = new.offered_listing_id and status = 'pending';
    end if;

    if new.status = 'declined' then
      insert into public.notifications (profile_id, type, title, body)
      values (
        new.sender_id, 'swap_request', 'Swap request declined',
        coalesce('Your offer for "' || listing_title || '" was declined.', 'Your swap request was declined.')
      );
    end if;

  elsif new.status = 'completed' then
    update public.listings set status = 'swapped' where id = new.listing_id;
    if new.offered_listing_id is not null then
      update public.listings set status = 'swapped' where id = new.offered_listing_id;
    end if;

    insert into public.notifications (profile_id, type, title, body)
    select p, 'swap_request', 'Swap completed', 'Both sides confirmed the swap — don''t forget to leave a rating.'
    from unnest(array[new.sender_id, new.receiver_id]) as p;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists after_swap_request_update on public.swap_requests;
create trigger after_swap_request_update
  after update on public.swap_requests
  for each row execute procedure public.handle_swap_request_after_update();

-- Notify every other participant in a conversation when a message arrives.
create or replace function public.handle_new_message()
returns trigger as $$
begin
  insert into public.notifications (profile_id, type, title, body)
  select cp.profile_id, 'message', 'New message', left(new.body, 140)
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.profile_id <> new.sender_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute procedure public.handle_new_message();

-- ---------------------------------------------------------------------------
-- 4. Ratings tied to a specific completed swap
-- ---------------------------------------------------------------------------

alter table public.ratings
  add column if not exists swap_request_id uuid references public.swap_requests(id) on delete set null;

-- One rating per participant per swap.
create unique index if not exists ratings_swap_request_author_idx
  on public.ratings (swap_request_id, author_id)
  where swap_request_id is not null;

create or replace function public.validate_rating()
returns trigger as $$
declare
  sr public.swap_requests%rowtype;
begin
  if new.swap_request_id is not null then
    select * into sr from public.swap_requests where id = new.swap_request_id;

    if sr.id is null then
      raise exception 'Swap request not found.';
    end if;

    if sr.status <> 'completed' then
      raise exception 'You can only rate a completed swap.';
    end if;

    if new.author_id not in (sr.sender_id, sr.receiver_id) then
      raise exception 'Only swap participants can rate this swap.';
    end if;

    if new.subject_id not in (sr.sender_id, sr.receiver_id) or new.subject_id = new.author_id then
      raise exception 'You can only rate the other participant in the swap.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_rating_insert on public.ratings;
create trigger before_rating_insert
  before insert on public.ratings
  for each row execute procedure public.validate_rating();
