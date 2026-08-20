-- Initial schema for swap-app MVP
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Mirrors prisma/schema.prisma; kept as raw SQL so RLS policies can live
-- alongside table creation.

create extension if not exists "uuid-ossp";

-- Profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Automatically create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Listings -----------------------------------------------------------------
create table if not exists public.listings (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  condition text not null,
  image_url text,
  wanted_in_return text,
  status text not null default 'available' check (status in ('available', 'pending', 'swapped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings enable row level security;

create policy "Listings are viewable by everyone"
  on public.listings for select using (true);

create policy "Users can insert their own listings"
  on public.listings for insert with check (auth.uid() = owner_id);

create policy "Users can update their own listings"
  on public.listings for update using (auth.uid() = owner_id);

create policy "Users can delete their own listings"
  on public.listings for delete using (auth.uid() = owner_id);

-- Wishlist -------------------------------------------------------------
create table if not exists public.wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, listing_id)
);

alter table public.wishlist_items enable row level security;

create policy "Users can view their own wishlist"
  on public.wishlist_items for select using (auth.uid() = profile_id);

create policy "Users can manage their own wishlist"
  on public.wishlist_items for insert with check (auth.uid() = profile_id);

create policy "Users can remove their own wishlist items"
  on public.wishlist_items for delete using (auth.uid() = profile_id);

-- Swap requests ----------------------------------------------------------
create table if not exists public.swap_requests (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  offered_item text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.swap_requests enable row level security;

create policy "Participants can view their swap requests"
  on public.swap_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can create swap requests as themselves"
  on public.swap_requests for insert with check (auth.uid() = sender_id);

create policy "Participants can update their swap requests"
  on public.swap_requests for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Ratings ------------------------------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.ratings enable row level security;

create policy "Ratings are viewable by everyone"
  on public.ratings for select using (true);

create policy "Users can leave ratings as themselves"
  on public.ratings for insert with check (auth.uid() = author_id);

-- Notifications --------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('swap_request', 'message', 'rating', 'system')),
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select using (auth.uid() = profile_id);

create policy "Users can update their own notifications"
  on public.notifications for update using (auth.uid() = profile_id);
