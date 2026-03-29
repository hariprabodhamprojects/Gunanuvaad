-- Invite list carries display names (admin-managed). Synced into profiles on signup and via RPC.

alter table public.allowed_emails
  add column if not exists display_name text;

comment on column public.allowed_emails.display_name is 'Shown in the app; copied to profiles when the user signs up.';

-- ── New users: copy email + name from allowlist into profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
  v_name text;
begin
  select nullif(trim(ae.display_name), '') into v_name
  from public.allowed_emails ae
  where ae.email = v_email
  limit 1;

  insert into public.profiles (id, email, display_name)
  values (new.id, v_email, v_name)
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(
          nullif(trim(public.profiles.display_name), ''),
          excluded.display_name
        ),
        updated_at = now();
  return new;
end;
$$;

-- Backfill profiles from current allowlist (empty display_name only)
update public.profiles p
set display_name = nullif(trim(ae.display_name), ''),
    updated_at = now()
from public.allowed_emails ae
where lower(p.email) = ae.email
  and ae.display_name is not null
  and trim(ae.display_name) <> ''
  and (p.display_name is null or trim(p.display_name) = '');

-- ── Call after login/onboarding so admin edits to allowlist names apply
create or replace function public.sync_invited_display_name()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.profiles p
  set display_name = nullif(trim(ae.display_name), ''),
      updated_at = now()
  from public.allowed_emails ae
  where p.id = auth.uid()
    and lower(p.email) = ae.email
    and ae.display_name is not null
    and trim(ae.display_name) <> '';
end;
$$;

revoke all on function public.sync_invited_display_name() from public;
grant execute on function public.sync_invited_display_name() to authenticated;
