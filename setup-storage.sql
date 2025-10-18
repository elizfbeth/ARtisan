-- ARtisan Storage Setup Script
-- Run this in the Supabase SQL Editor to set up storage buckets and policies

-- Create storage buckets if they don't exist
insert into storage.buckets (id, name, public)
values 
  ('photos', 'photos', true),
  ('environments', 'environments', true),
  ('models', 'models', true),
  ('audio', 'audio', true)
on conflict (id) do update set public = true;

-- Drop existing policies if they exist
drop policy if exists "Allow public uploads to photos" on storage.objects;
drop policy if exists "Allow public reads from photos" on storage.objects;
drop policy if exists "Allow public uploads to environments" on storage.objects;
drop policy if exists "Allow public reads from environments" on storage.objects;
drop policy if exists "Allow public uploads to models" on storage.objects;
drop policy if exists "Allow public reads from models" on storage.objects;
drop policy if exists "Allow public uploads to audio" on storage.objects;
drop policy if exists "Allow public reads from audio" on storage.objects;

-- Create policies for photos bucket
create policy "Allow public uploads to photos"
on storage.objects for insert
to public
with check (bucket_id = 'photos');

create policy "Allow public reads from photos"
on storage.objects for select
to public
using (bucket_id = 'photos');

-- Create policies for environments bucket
create policy "Allow public uploads to environments"
on storage.objects for insert
to public
with check (bucket_id = 'environments');

create policy "Allow public reads from environments"
on storage.objects for select
to public
using (bucket_id = 'environments');

-- Create policies for models bucket
create policy "Allow public uploads to models"
on storage.objects for insert
to public
with check (bucket_id = 'models');

create policy "Allow public reads from models"
on storage.objects for select
to public
using (bucket_id = 'models');

-- Create policies for audio bucket
create policy "Allow public uploads to audio"
on storage.objects for insert
to public
with check (bucket_id = 'audio');

create policy "Allow public reads from audio"
on storage.objects for select
to public
using (bucket_id = 'audio');

