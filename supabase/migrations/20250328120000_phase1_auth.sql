-- Phase 1: invite-only emails + profiles (run in Supabase SQL Editor or `supabase db push`)

-- ── Invite list: only these emails may use the app (all lower-case)
create table if not exists public.allowed_emails (
  email text primary key,
  is_organizer boolean not null default false,
  created_at timestamptz not null default now(),
  constraint allowed_emails_email_lower check (email = lower(email))
);

alter table public.allowed_emails enable row level security;

-- Each user can read only their own row — used to verify allowlist after login
create policy "allowed_emails_select_own"
  on public.allowed_emails
  for select
  to authenticated
  using (
    lower(email) = lower((select email from auth.users where id = auth.uid()))
  );

-- ── Profile (Phase 2 will add name/photo UI)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- ── Auto-create profile row when a user signs up (Auth → public.profiles)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(coalesce(new.email, '')))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ── Seed your 100 emails (run after migration), e.g.:
-- insert into public.allowed_emails (email, is_organizer) values
--   ('you@yourdomain.com', true),
--   ('friend@yourdomain.com', false)
-- on conflict (email) do update set is_organizer = excluded.is_organizer;
