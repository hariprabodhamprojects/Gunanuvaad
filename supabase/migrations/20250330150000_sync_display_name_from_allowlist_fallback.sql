-- Display name for profiles: prefer allowed_emails.display_name; if null, derive from the local part
-- of the email (e.g. john.doe@gmail.com → "John Doe"). Only when the email exists in allowed_emails.

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
  select coalesce(
    nullif(trim(ae.display_name), ''),
    initcap(replace(split_part(v_email, '@', 1), '.', ' '))
  )
  into v_name
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

-- Sync from allowlist whenever invited; fills missing names using the same fallback.
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
  set display_name = coalesce(
    nullif(trim(ae.display_name), ''),
    initcap(replace(split_part(lower(trim(p.email)), '@', 1), '.', ' '))
  ),
      updated_at = now()
  from public.allowed_emails ae
  where p.id = auth.uid()
    and ae.email = lower(trim(p.email));
end;
$$;

-- Backfill anyone on the allowlist who still has an empty display_name
update public.profiles p
set display_name = coalesce(
  nullif(trim(ae.display_name), ''),
  initcap(replace(split_part(lower(trim(p.email)), '@', 1), '.', ' '))
),
updated_at = now()
from public.allowed_emails ae
where lower(trim(p.email)) = ae.email
  and (p.display_name is null or trim(p.display_name) = '');
