-- Harden client-facing swap authorization.
-- Run after 0011. This closes ownership and state-mutation gaps in the
-- original client-side Supabase flow.

-- A new request must target an available listing owned by its receiver.
drop policy if exists "Users can create swap requests as themselves" on public.swap_requests;
create policy "Users can create swap requests as themselves"
  on public.swap_requests for insert
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
    and parent_request_id is null
    and not public.blocked_between(sender_id, receiver_id)
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.owner_id = receiver_id
        and l.status = 'available'
    )
  );

-- Only the original receiver can create a counter-offer. The new request
-- reverses the participants, keeps the same target, and may only reply to
-- a still-pending parent request.
drop policy if exists "Participants can submit a counter offer" on public.swap_requests;
create policy "Participants can submit a counter offer"
  on public.swap_requests for insert
  with check (
    auth.uid() = sender_id
    and parent_request_id is not null
    and not public.blocked_between(sender_id, receiver_id)
    and exists (
      select 1 from public.swap_requests parent
      where parent.id = parent_request_id
        and parent.status = 'pending'
        and parent.listing_id = listing_id
        and parent.receiver_id = sender_id
        and parent.sender_id = receiver_id
    )
  );

-- Each offered item must belong to the signed-in sender and remain available.
drop policy if exists "Participants can add items to a pending swap request" on public.swap_request_items;
create policy "Senders can add their own available items to a pending swap request"
  on public.swap_request_items for insert
  with check (
    exists (
      select 1
      from public.swap_requests sr
      join public.listings l on l.id = listing_id
      where sr.id = swap_request_id
        and sr.status = 'pending'
        and sr.sender_id = auth.uid()
        and l.owner_id = auth.uid()
        and l.status = 'available'
        and l.id <> sr.listing_id
    )
  );

-- RLS decides who may issue an update; this trigger limits exactly what that
-- participant may change. In particular, IDs, offered terms, and completion
-- timestamps cannot be forged through a generic .update() call.
create or replace function public.handle_swap_request_before_update()
returns trigger as $$
begin
  if new.listing_id is distinct from old.listing_id
     or new.sender_id is distinct from old.sender_id
     or new.receiver_id is distinct from old.receiver_id
     or new.parent_request_id is distinct from old.parent_request_id then
    raise exception 'Swap participants and terms cannot be changed.';
  end if;

  if new.status = old.status then
    if old.status <> 'accepted' then
      raise exception 'No changes are allowed in this swap state.';
    end if;

    if auth.uid() = old.sender_id
       and new.receiver_completed_at is not distinct from old.receiver_completed_at then
      new.sender_completed_at := coalesce(old.sender_completed_at, now());
    elsif auth.uid() = old.receiver_id
       and new.sender_completed_at is not distinct from old.sender_completed_at then
      new.receiver_completed_at := coalesce(old.receiver_completed_at, now());
    else
      raise exception 'Only a participant may confirm their own side.';
    end if;
  else
    if new.sender_completed_at is distinct from old.sender_completed_at
       or new.receiver_completed_at is distinct from old.receiver_completed_at then
      raise exception 'Completion timestamps cannot be changed with swap status.';
    end if;

    if old.status = 'pending' and new.status = 'accepted' then
      if auth.uid() <> old.receiver_id then
        raise exception 'Only the receiver can accept a swap request.';
      end if;
      if not exists (
        select 1 from public.listings l
        where l.id = old.listing_id and l.status = 'available'
      ) or not exists (
        select 1 from public.swap_request_items sri
        join public.listings l on l.id = sri.listing_id
        where sri.swap_request_id = old.id and l.status = 'available'
      ) or exists (
        select 1 from public.swap_request_items sri
        join public.listings l on l.id = sri.listing_id
        where sri.swap_request_id = old.id and l.status <> 'available'
      ) then
        raise exception 'All items in a swap must still be available.';
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
    else
      raise exception 'Invalid swap request status transition.';
    end if;
  end if;

  if new.sender_completed_at is not null and new.receiver_completed_at is not null then
    new.status := 'completed';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
