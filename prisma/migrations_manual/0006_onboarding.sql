-- Onboarding gate: a real "complete your profile" step after signup,
-- enforced in middleware.ts rather than left as inline page text.
-- Run this in the Supabase SQL editor after 0001-0005.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Don't retroactively force onboarding on profiles that already have
-- clearly been filled in before this feature existed.
update public.profiles
set onboarding_completed = true
where full_name is not null or bio is not null or location is not null;
