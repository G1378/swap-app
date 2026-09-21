-- Two-sided counter-offers + points top-up on a negotiated swap.
--
-- Builds on 0012_harden_swap_authorization.sql, which landed after this
-- work started (it independently fixed the same completion-timestamp bug
-- this migration was originally going to fix, plus added immutability and
-- re-validation guards this migration keeps). Three things happen here:
--
--   1. The single `listing_id` column ("the one thing being requested")
--      becomes a bundle, symmetric with the existing offered-items bundle
--      — so a counter-offer can ask for more than one item back, not just
--      the original one, and either party (not just the receiver) can
--      revise what they're putting up. `swap_request_items` grows a
--      `side` column and now holds both bundles.
--
--   2. `offered_points` / `requested_points` let either side sweeten a
--      trade with points earned elsewhere in the app. This does not
--      reopen the cash-for-items door closed in 0010: points still can't
--      be bought with real money, there's no way to acquire a listing
--      with points alone, and nothing here is a price — it's an optional
--      top-up inside an item-for-item trade, settled as a real balance
--      transfer the moment that trade completes.
--
--   3. Swap-request writes that touch more than one row (create a
--      request, submit a counter) move into SECURITY DEFINER functions so
--      they're atomic and can validate item ownership / points balances
--      server-side. This is also *why* the two client-facing insert
--      policies 0012 just hardened get dropped below rather than updated:
--      a row-level WITH CHECK policy can only see the swap_requests row
--      being inserted, not the swap_request_items rows that describe its
--      bundles (those are inserted afterward, in the same transaction, by
--      the functions below) — there's no way to express "the requested
--      bundle belongs to the receiver and is available" as a check on a
--      single row that doesn't know the bundle yet. The functions below
--      have full transactional visibility instead and validate this
--      properly; direct client inserts are no longer a supported path.
--
-- Run this in the Supabase SQL editor after 0001-0012.

-- ---------------------------------------------------------------------------
-- 1. swap_request_items becomes a two-sided bundle.
-- ---------------------------------------------------------------------------

alter table public.swap_request_items
  add column if not exists side text not null default 'offered';

alter table public.swap_request_items drop constraint if exists swap_request_items_side_check;
alter table public.swap_request_items add constraint swap_request_items_side_check
  check (side in ('offered', 'requested'));

alter table public.swap_request_items drop constraint if exists swap_request_items_swap_request_id_listing_id_key;
alter table public.swap_request_items add constraint swap_request_items_swap_request_id_listing_id_side_key
  unique (swap_request_id, listing_id, side);

-- Backfill: every existing row's single requested listing becomes a
-- one-item 'requested' bundle, mirroring the 'offered' bundle rows it
-- already has.
insert into public.swap_request_items (swap_request_id, listing_id, side)
select id, listing_id, 'requested' from public.swap_requests
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Points top-up columns + a new ledger reason for the transfer they
--    cause at settlement (part 7).
-- ---------------------------------------------------------------------------

alter table public.swap_requests
  add column if not exists offered_points integer not null default 0 check (offered_points >= 0),
  add column if not exists requested_points integer not null default 0 check (requested_points >= 0);

comment on column public.swap_requests.offered_points is
  'Points the sender of this round is adding on top of their offered bundle.';
comment on column public.swap_requests.requested_points is
  'Points the sender of this round is asking the receiver to add on top of the requested bundle.';

alter table public.points_transactions drop constraint if exists points_transactions_reason_check;
alter table public.points_transactions add constraint points_transactions_reason_check
  check (reason in (
    'swap_completed', 'streak_milestone', 'quest_completed', 'referral',
    'featured_listing_boost', 'profile_cosmetic', 'priority_match', 'category_unlock',
    'adjustment', 'swap_points_trade'
  ));

-- ---------------------------------------------------------------------------
-- 3. Drop the client-facing insert policies 0012 hardened — both reference
--    listing_id (going away in part 4) and, as explained above, can't be
--    meaningfully rewritten at the RLS layer for a bundle. With RLS
--    enabled and no insert policy, plain client inserts are denied by
--    default; create_swap_request()/submit_counter_offer() (part 5-6)
--    are SECURITY DEFINER and bypass RLS, so they're unaffected and
--    remain the only way to open a request or submit a counter.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can create swap requests as themselves" on public.swap_requests;
drop policy if exists "Participants can submit a counter offer" on public.swap_requests;
drop policy if exists "Senders can add their own available items to a pending swap request" on public.swap_request_items;

-- ---------------------------------------------------------------------------
-- 4. listing_id (the old single "requested" column) is now redundant with
--    the 'requested' side of the bundle above — drop it, and the index
--    that depended on it.
-- ---------------------------------------------------------------------------

drop index if exists public.swap_requests_active_sender_listing_idx;
-- Enforced "one active request per (listing, sender)". create_swap_request()
-- below enforces the same rule in application logic against the bundle
-- table instead, since "the listing" isn't a single column anymore.

alter table public.swap_requests drop column if exists listing_id;

-- ---------------------------------------------------------------------------
-- 5. create_swap_request — the only supported way to open a new swap
--    request. Validates both bundles belong to the right people and are
--    available, checks the sender can actually cover any points they're
--    offering, and keeps the "no duplicate active request for the same
--    item" guarantee the dropped unique index used to provide.
-- ---------------------------------------------------------------------------

create or replace function public.create_swap_request(
  p_receiver_id uuid,
  p_requested_listing_ids uuid[],
  p_offered_listing_ids uuid[],
  p_offered_points integer default 0,
  p_note text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_swap_id uuid;
  v_conv_id uuid;
  v_balance integer;
  v_title text;
begin
  if v_sender_id is null then
    raise exception 'You must be signed in to request a swap.';
  end if;
  if p_receiver_id = v_sender_id then
    raise exception 'You cannot swap with yourself.';
  end if;
  if public.blocked_between(v_sender_id, p_receiver_id) then
    raise exception 'You cannot contact this user.';
  end if;
  if p_requested_listing_ids is null or array_length(p_requested_listing_ids, 1) is null then
    raise exception 'Choose at least one item to request.';
  end if;
  if p_offered_listing_ids is null or array_length(p_offered_listing_ids, 1) is null then
    raise exception 'Choose at least one item to offer.';
  end if;
  if coalesce(p_offered_points, 0) < 0 then
    raise exception 'Points cannot be negative.';
  end if;

  if exists (
    select 1 from unnest(p_requested_listing_ids) as rid
    left join public.listings l on l.id = rid
    where l.id is null or l.owner_id <> p_receiver_id or l.status <> 'available'
  ) then
    raise exception 'One or more requested items are no longer available.';
  end if;

  if exists (
    select 1 from unnest(p_offered_listing_ids) as oid
    left join public.listings l on l.id = oid
    where l.id is null or l.owner_id <> v_sender_id or l.status <> 'available'
  ) then
    raise exception 'One or more of your offered items are no longer available.';
  end if;

  if coalesce(p_offered_points, 0) > 0 then
    select points_balance into v_balance from public.gamification_profiles where profile_id = v_sender_id;
    if v_balance is null or v_balance < p_offered_points then
      raise exception 'You do not have enough points for that offer.';
    end if;
  end if;

  if exists (
    select 1
    from public.swap_requests sr
    join public.swap_request_items sri
      on sri.swap_request_id = sr.id and sri.side = 'requested'
    where sr.sender_id = v_sender_id
      and sr.status in ('pending', 'accepted')
      and sri.listing_id = any(p_requested_listing_ids)
  ) then
    raise exception 'You already have an active request for one of these items.';
  end if;

  insert into public.swap_requests (sender_id, receiver_id, offered_points)
  values (v_sender_id, p_receiver_id, coalesce(p_offered_points, 0))
  returning id into v_swap_id;
  -- The insert above fires handle_new_swap_request (conversation setup)
  -- immediately, synchronously, before control returns here.

  insert into public.swap_request_items (swap_request_id, listing_id, side)
  select v_swap_id, x, 'requested' from unnest(p_requested_listing_ids) as x;

  insert into public.swap_request_items (swap_request_id, listing_id, side)
  select v_swap_id, x, 'offered' from unnest(p_offered_listing_ids) as x;

  select string_agg(title, ', ') into v_title from public.listings where id = any(p_requested_listing_ids);

  insert into public.notifications (profile_id, type, title, body, link)
  values (
    p_receiver_id, 'swap_request', 'New swap request',
    coalesce('Someone wants to swap for "' || v_title || '".', 'You have a new swap request.'),
    '/swaps/' || v_swap_id
  );

  if p_note is not null and btrim(p_note) <> '' then
    select id into v_conv_id from public.conversations where swap_request_id = v_swap_id;
    if v_conv_id is not null then
      insert into public.messages (conversation_id, sender_id, body) values (v_conv_id, v_sender_id, btrim(p_note));
    end if;
  end if;

  return v_swap_id;
end;
$$;

grant execute on function public.create_swap_request(uuid, uuid[], uuid[], integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. submit_counter_offer — a single atomic call in place of the old
--    two-call client flow (insert the new row, then separately update the
--    parent to 'countered', with no transaction tying them together).
--    Either participant in a pending request can call this: it can now
--    ask for *multiple* specific items from the other person's inventory,
--    not just re-offer from the caller's own listings, and it can change
--    what the caller is putting up at the same time.
-- ---------------------------------------------------------------------------

create or replace function public.submit_counter_offer(
  p_parent_request_id uuid,
  p_requested_listing_ids uuid[],
  p_offered_listing_ids uuid[],
  p_offered_points integer default 0,
  p_requested_points integer default 0,
  p_note text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_parent public.swap_requests%rowtype;
  v_other_id uuid;
  v_new_id uuid;
  v_conv_id uuid;
  v_balance integer;
  v_title text;
begin
  if v_caller is null then
    raise exception 'You must be signed in to counter a swap request.';
  end if;

  -- Row-locked so two simultaneous counters on the same parent can't both
  -- succeed — the second one will see status <> 'pending' below and fail
  -- cleanly instead of silently forking the negotiation.
  select * into v_parent from public.swap_requests where id = p_parent_request_id for update;
  if not found then
    raise exception 'Swap request not found.';
  end if;
  if v_caller not in (v_parent.sender_id, v_parent.receiver_id) then
    raise exception 'Only a participant can counter this swap request.';
  end if;
  if v_parent.status <> 'pending' then
    raise exception 'This request can no longer be countered.';
  end if;

  v_other_id := case when v_caller = v_parent.sender_id then v_parent.receiver_id else v_parent.sender_id end;

  if p_requested_listing_ids is null or array_length(p_requested_listing_ids, 1) is null then
    raise exception 'Choose at least one item to request.';
  end if;
  if p_offered_listing_ids is null or array_length(p_offered_listing_ids, 1) is null then
    raise exception 'Choose at least one item to offer.';
  end if;
  if coalesce(p_offered_points, 0) < 0 or coalesce(p_requested_points, 0) < 0 then
    raise exception 'Points cannot be negative.';
  end if;

  if exists (
    select 1 from unnest(p_requested_listing_ids) as rid
    left join public.listings l on l.id = rid
    where l.id is null or l.owner_id <> v_other_id or l.status <> 'available'
  ) then
    raise exception 'One or more requested items are not available from the other party.';
  end if;

  if exists (
    select 1 from unnest(p_offered_listing_ids) as oid
    left join public.listings l on l.id = oid
    where l.id is null or l.owner_id <> v_caller or l.status <> 'available'
  ) then
    raise exception 'One or more of your offered items are not available.';
  end if;

  if coalesce(p_offered_points, 0) > 0 then
    select points_balance into v_balance from public.gamification_profiles where profile_id = v_caller;
    if v_balance is null or v_balance < p_offered_points then
      raise exception 'You do not have enough points to offer that many.';
    end if;
  end if;
  if coalesce(p_requested_points, 0) > 0 then
    select points_balance into v_balance from public.gamification_profiles where profile_id = v_other_id;
    if v_balance is null or v_balance < p_requested_points then
      raise exception 'The other party does not have enough points to cover that.';
    end if;
  end if;

  insert into public.swap_requests
    (sender_id, receiver_id, parent_request_id, offered_points, requested_points)
  values
    (v_caller, v_other_id, p_parent_request_id, coalesce(p_offered_points, 0), coalesce(p_requested_points, 0))
  returning id into v_new_id;

  insert into public.swap_request_items (swap_request_id, listing_id, side)
  select v_new_id, x, 'requested' from unnest(p_requested_listing_ids) as x;

  insert into public.swap_request_items (swap_request_id, listing_id, side)
  select v_new_id, x, 'offered' from unnest(p_offered_listing_ids) as x;

  update public.swap_requests set status = 'countered' where id = p_parent_request_id;

  select string_agg(title, ', ') into v_title from public.listings where id = any(p_requested_listing_ids);

  insert into public.notifications (profile_id, type, title, body, link)
  values (
    v_other_id, 'swap_request', 'Counter-offer received',
    coalesce('New terms were proposed for "' || v_title || '".', 'New terms were proposed for your swap.'),
    '/swaps/' || v_new_id
  );

  if p_note is not null and btrim(p_note) <> '' then
    select id into v_conv_id from public.conversations where swap_request_id = v_new_id;
    if v_conv_id is not null then
      insert into public.messages (conversation_id, sender_id, body) values (v_conv_id, v_caller, btrim(p_note));
    end if;
  end if;

  return v_new_id;
end;
$$;

grant execute on function public.submit_counter_offer(uuid, uuid[], uuid[], integer, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. handle_new_swap_request no longer writes the "new request" / "counter
--    received" notification — it used to read the requested listing's
--    title directly off `new.listing_id`, which existed on the row at
--    insert time. Now the requested bundle is a set of rows inserted
--    afterward, in the same statement, by the two functions above, so
--    those functions write the (now bundle-aware) notification themselves
--    once the bundle actually exists. This trigger keeps only the
--    conversation carry-over, which never needed the bundle.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_swap_request()
returns trigger as $$
declare
  conv_id uuid;
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

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 8. before_swap_request_update: extends 0012's version rather than
--    replacing its intent. Kept as-is from 0012: the immutability guard
--    (minus listing_id, which is gone — sender_id/receiver_id/
--    parent_request_id still can't change), the forced-server-timestamp +
--    one-side-at-a-time completion handling, and the receiver-only
--    accept/decline checks.
--
--    Changed:
--      - The accept-time "everything involved is still available" check
--        used to test the single `old.listing_id` row and the bundle
--        separately. There's only the bundle now (both sides live in
--        swap_request_items), so it's one unified check.
--      - 'pending' -> 'countered' is now allowed for either participant,
--        not just the receiver (submit_counter_offer performs this update
--        as auth.uid() of whoever is actually countering, which can now
--        be either side).
--      - The moment both sides confirm, any points that were part of the
--        deal are transferred for real — this is the only place a point
--        ever moves between two users' balances.
-- ---------------------------------------------------------------------------

create or replace function public.handle_swap_request_before_update()
returns trigger as $$
declare
  v_net integer;
  v_payer uuid;
  v_payee uuid;
  v_amount integer;
  v_payer_gp public.gamification_profiles%rowtype;
  v_payee_gp public.gamification_profiles%rowtype;
  v_payer_balance integer;
  v_payee_balance integer;
begin
  if new.sender_id is distinct from old.sender_id
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
      if exists (
        select 1
        from public.swap_request_items sri
        join public.listings l on l.id = sri.listing_id
        where sri.swap_request_id = old.id and l.status <> 'available'
      ) or not exists (
        select 1 from public.swap_request_items sri where sri.swap_request_id = old.id
      ) then
        raise exception 'All items in a swap must still be available.';
      end if;

    elsif old.status = 'pending' and new.status = 'declined' then
      if auth.uid() <> old.receiver_id then
        raise exception 'Only the receiver can decline a swap request.';
      end if;

    elsif old.status = 'pending' and new.status = 'countered' then
      if auth.uid() not in (old.sender_id, old.receiver_id) then
        raise exception 'Only a participant can counter a swap request.';
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

    v_net := coalesce(new.offered_points, 0) - coalesce(new.requested_points, 0);

    if v_net > 0 then
      v_payer := new.sender_id;
      v_payee := new.receiver_id;
      v_amount := v_net;
    elsif v_net < 0 then
      v_payer := new.receiver_id;
      v_payee := new.sender_id;
      v_amount := -v_net;
    else
      v_amount := 0;
    end if;

    if v_amount > 0 then
      select * into v_payer_gp from public.gamification_profiles where profile_id = v_payer for update;
      select * into v_payee_gp from public.gamification_profiles where profile_id = v_payee for update;

      if v_payer_gp.points_balance < v_amount then
        raise exception 'Not enough points to complete this swap — % points are needed to settle it.', v_amount;
      end if;

      v_payer_balance := v_payer_gp.points_balance - v_amount;
      v_payee_balance := v_payee_gp.points_balance + v_amount;

      update public.gamification_profiles set points_balance = v_payer_balance where id = v_payer_gp.id;
      update public.gamification_profiles set points_balance = v_payee_balance where id = v_payee_gp.id;

      insert into public.points_transactions
        (gamification_profile_id, type, reason, amount, balance_after, related_swap_request_id, note)
      values
        (v_payer_gp.id, 'spend', 'swap_points_trade', v_amount, v_payer_balance, new.id, 'Points settled for a completed swap.');

      insert into public.points_transactions
        (gamification_profile_id, type, reason, amount, balance_after, related_swap_request_id, note)
      values
        (v_payee_gp.id, 'earn', 'swap_points_trade', v_amount, v_payee_balance, new.id, 'Points settled for a completed swap.');
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 9. handle_swap_request_after_update / prevent_active_listing_delete —
--    unaffected by 0012, unchanged here except for no longer referencing
--    the dropped listing_id column; both already swept the bundle table,
--    which now covers both sides.
-- ---------------------------------------------------------------------------

create or replace function public.handle_swap_request_after_update()
returns trigger as $$
declare
  listing_title text;
begin
  if new.status = old.status then
    return new;
  end if;

  select string_agg(l.title, ', ') into listing_title
  from public.listings l
  join public.swap_request_items sri on sri.listing_id = l.id
  where sri.swap_request_id = new.id and sri.side = 'requested';

  if new.status = 'accepted' then
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
    update public.listings set status = 'swapped'
      where id in (select listing_id from public.swap_request_items where swap_request_id = new.id);

    insert into public.notifications (profile_id, type, title, body, link)
    select p, 'swap_request', 'Swap completed', 'Both sides confirmed the swap — don''t forget to leave a rating.',
      '/swaps/' || new.id
    from unnest(array[new.sender_id, new.receiver_id]) as p;

  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.prevent_active_listing_delete()
returns trigger as $$
begin
  if exists (
    select 1 from public.swap_request_items sri
    join public.swap_requests sr on sr.id = sri.swap_request_id
    where sri.listing_id = old.id and sr.status in ('pending', 'accepted')
  ) then
    raise exception 'Cannot delete a listing that is part of an active swap request.';
  end if;
  return old;
end;
$$ language plpgsql security definer set search_path = public;
