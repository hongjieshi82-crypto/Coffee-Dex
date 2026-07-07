-- Coffee-Dex 多人上线版 Supabase 表结构
-- 在 Supabase SQL Editor 中执行。

create extension if not exists pgcrypto;

create table if not exists public.coffee_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coffee_type text not null,
  coffee_name text not null default '',
  category_id text not null,
  volume_ml integer not null default 240,
  image_url text,
  image_path text,
  caffeine integer not null default 0,
  temp text,
  sugar text,
  ai_comment text not null default '',
  toxic_quote text not null default '',
  timestamp bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_coffee_records_user_timestamp
  on public.coffee_records(user_id, timestamp desc);

create index if not exists idx_coffee_records_user_category
  on public.coffee_records(user_id, category_id);

create index if not exists idx_coffee_records_user_type
  on public.coffee_records(user_id, coffee_type);

alter table public.coffee_records enable row level security;

drop policy if exists "coffee_records_select_own" on public.coffee_records;
drop policy if exists "coffee_records_insert_own" on public.coffee_records;
drop policy if exists "coffee_records_update_own" on public.coffee_records;
drop policy if exists "coffee_records_delete_own" on public.coffee_records;

create policy "coffee_records_select_own"
  on public.coffee_records for select
  using (auth.uid() = user_id);

create policy "coffee_records_insert_own"
  on public.coffee_records for insert
  with check (auth.uid() = user_id);

create policy "coffee_records_update_own"
  on public.coffee_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "coffee_records_delete_own"
  on public.coffee_records for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coffee-photos',
  'coffee-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "coffee_photos_public_read" on storage.objects;
drop policy if exists "coffee_photos_user_insert" on storage.objects;
drop policy if exists "coffee_photos_user_update" on storage.objects;
drop policy if exists "coffee_photos_user_delete" on storage.objects;

create policy "coffee_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'coffee-photos');

create policy "coffee_photos_user_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'coffee-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "coffee_photos_user_update"
  on storage.objects for update
  using (
    bucket_id = 'coffee-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "coffee_photos_user_delete"
  on storage.objects for delete
  using (
    bucket_id = 'coffee-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
