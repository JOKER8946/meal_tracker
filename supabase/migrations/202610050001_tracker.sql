-- Feature 1: run this entire file once in a NEW Supabase project's SQL Editor.
-- Transactional: any error rolls back the migration. No service-role key needed.
begin;

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  notes text not null default '' check (char_length(notes) <= 5000),
  eaten_at timestamptz not null,
  -- The user's selected calendar day; does not shift when viewed in another zone.
  meal_date date not null,
  photo_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_photo_owned check (
    photo_path ~ ('^' || user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|jpeg)$')
  )
);

create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- A night belongs to the calendar day the user woke up.
  sleep_date date not null,
  slept_at timestamptz not null,
  woke_at timestamptz not null,
  duration_minutes numeric generated always as (
    extract(epoch from (woke_at - slept_at)) / 60
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sleep_positive check (woke_at > slept_at),
  constraint sleep_at_most_one_day check (woke_at - slept_at <= interval '24 hours'),
  constraint one_sleep_per_day unique (user_id, sleep_date)
);

create index meals_user_day on public.meals(user_id, meal_date, eaten_at);
-- The unique sleep constraint already indexes (user_id, sleep_date).

create function public.tracker_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.tracker_set_updated_at() from public;

create trigger meals_updated_at before update on public.meals
for each row execute function public.tracker_set_updated_at();
create trigger sleep_updated_at before update on public.sleep_logs
for each row execute function public.tracker_set_updated_at();

alter table public.meals enable row level security;
alter table public.sleep_logs enable row level security;
revoke all on public.meals, public.sleep_logs from anon, authenticated;
grant select, insert, update, delete on public.meals, public.sleep_logs to authenticated;

create policy meals_owner on public.meals for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy sleep_owner on public.sleep_logs for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- A private bucket: photos require the user's JWT (or an expiring signed URL).
-- 200,000 bytes is a hard upload ceiling; client compression targets below it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 200000, array['image/webp', 'image/jpeg']);

create policy meal_photos_read on storage.objects for select to authenticated
using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy meal_photos_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'meal-photos'
  and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|jpeg)$')
);

create policy meal_photos_update on storage.objects for update to authenticated
using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (
  bucket_id = 'meal-photos'
  and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|jpeg)$')
);

create policy meal_photos_delete on storage.objects for delete to authenticated
using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
