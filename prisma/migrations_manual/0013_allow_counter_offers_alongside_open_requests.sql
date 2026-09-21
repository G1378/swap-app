-- The active-offer uniqueness rule applies to initial requests only.
-- A counter-offer intentionally reverses sender/receiver while retaining the
-- same target listing, and must not collide with a separate open request that
-- the countering user already sent for that listing.

drop index if exists public.swap_requests_active_sender_listing_idx;

create unique index swap_requests_active_sender_listing_idx
  on public.swap_requests (listing_id, sender_id)
  where parent_request_id is null
    and status in ('pending', 'accepted');
