-- Trust & safety: blocking and reporting.
-- Run this in the Supabase SQL editor after 0001-0007.

-- ---------------------------------------------------------------------------
-- 1. Blocks. Directional in storage (blocker_id -> blocked_id) but treated
--    as mutual everywhere in the app — if either side blocks, both sides
--    stop seeing each other's listings/profile activity and can't start
--    new swap requests.
-- ---------------------------------------------------------------------------

create table if not exists public.blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "Users can view their own blocks"
  on public.blocks for select using (auth.uid() = blocker_id);

create policy "Users can create their own blocks"
  on public.blocks for insert with check (auth.uid() = blocker_id);

create policy "Users can remove their own blocks"
  on public.blocks for delete using (auth.uid() = blocker_id);

-- Security-definer helper so RLS-restricted tables (like swap_requests
-- below) can check for a block in either direction without needing their
-- own broader visibility into the blocks table.
create or replace function public.blocked_between(a uuid, b uuid)
returns boolean as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists "Users can create swap requests as themselves" on public.swap_requests;
create policy "Users can create swap requests as themselves"
  on public.swap_requests for insert
  with check (
    auth.uid() = sender_id
    and not public.blocked_between(sender_id, receiver_id)
  );

-- ---------------------------------------------------------------------------
-- 2. Reports. Stored for later review — this app has no admin dashboard
--    yet, so these just accumulate for now rather than routing anywhere.
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  reason text not null check (reason in ('spam', 'scam_or_fraud', 'inappropriate_content', 'harassment', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

alter table public.reports enable row level security;

create policy "Users can view their own reports"
  on public.reports for select using (auth.uid() = reporter_id);

create policy "Users can create reports"
  on public.reports for insert with check (auth.uid() = reporter_id);
