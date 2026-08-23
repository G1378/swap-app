-- Inbox upgrades: clickable notifications + a missing "you got rated"
-- notification + per-participant read tracking for conversations.
-- Run this in the Supabase SQL editor after 0001-0004.

-- ---------------------------------------------------------------------------
-- 1. Notifications gain a `link` so the bell dropdown can navigate somewhere
--    useful instead of just displaying text.
-- ---------------------------------------------------------------------------

alter table public.notifications
  add column if not exists link text;

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

  insert into public.notifications (profile_id, type, title, body, link)
  values (
    new.receiver_id,
    'swap_request',
    'New swap request',
    coalesce('Someone wants to swap for "' || listing_title || '".', 'You have a new swap request.'),
    '/swaps/' || new.id
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public;

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

    insert into public.notifications (profile_id, type, title, body, link)
    values (
      new.sender_id, 'swap_request', 'Swap request accepted',
      coalesce('Your offer for "' || listing_title || '" was accepted.', 'Your swap request was accepted.'),
      '/swaps/' || new.id
    );

  elsif new.status in ('declined', 'cancelled') then
    update public.listings set status = 'available'
      where id = new.listing_id and status = 'pending';
    if new.offered_listing_id is not null then
      update public.listings set status = 'available'
        where id = new.offered_listing_id and status = 'pending';
    end if;

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
    if new.offered_listing_id is not null then
      update public.listings set status = 'swapped' where id = new.offered_listing_id;
    end if;

    insert into public.notifications (profile_id, type, title, body, link)
    select p, 'swap_request', 'Swap completed', 'Both sides confirmed the swap — don''t forget to leave a rating.',
      '/swaps/' || new.id
    from unnest(array[new.sender_id, new.receiver_id]) as p;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.handle_new_message()
returns trigger as $$
declare
  target_swap_request_id uuid;
begin
  select swap_request_id into target_swap_request_id
  from public.conversations where id = new.conversation_id;

  insert into public.notifications (profile_id, type, title, body, link)
  select cp.profile_id, 'message', 'New message', left(new.body, 140),
    case when target_swap_request_id is not null then '/swaps/' || target_swap_request_id else null end
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.profile_id <> new.sender_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 2. A "you received a rating" notification — the `rating` type already
--    existed in the check constraint but nothing was ever inserting one.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_rating()
returns trigger as $$
begin
  insert into public.notifications (profile_id, type, title, body, link)
  values (
    new.subject_id,
    'rating',
    'New rating',
    new.score || '-star rating' || case when new.comment is not null then ' with a comment' else '' end,
    '/profile'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists after_rating_insert on public.ratings;
create trigger after_rating_insert
  after insert on public.ratings
  for each row execute procedure public.handle_new_rating();

-- ---------------------------------------------------------------------------
-- 3. Per-participant read tracking for conversations, so the swaps list can
--    show an unread badge and the chat thread can clear it.
-- ---------------------------------------------------------------------------

alter table public.conversation_participants
  add column if not exists last_read_at timestamptz;
