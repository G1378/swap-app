-- Storage setup for listing photos
-- Run this in the Supabase SQL editor after 0001_init.sql.

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Anyone can view listing photos (bucket is public).
create policy "Listing images are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'listing-images');

-- Authenticated users can upload into a folder named after their own user id,
-- i.e. path must start with "<their-auth-uid>/...".
create policy "Users can upload their own listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own listing images"
  on storage.objects for update
  using (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own listing images"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
