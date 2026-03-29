-- Phase 6+: featured picks (pointer rows only) + organizer allowlist overview (signup / profile readiness).

create table if not exists public.featured_daily_notes (
  id uuid primary key default gen_random_uuid(),
  daily_note_id uuid not null references public.daily_notes (id) on delete cascade,
  featured_at timestamptz not null default now(),
  featured_by uuid references auth.users (id) on delete set null,
  constraint featured_daily_notes_one_per_note unique (daily_note_id)
);

create index if not exists featured_daily_notes_featured_at_desc
  on public.featured_daily_notes (featured_at desc);

alter table public.featured_daily_notes enable row level security;

-- No policies: access only via security definer RPCs below.

-- ── Allowlist + profile / signup status (all invited emails)
create or replace function public.admin_allowlist_overview()
returns table (
  email text,
  invite_display_name text,
  is_organizer boolean,
  user_id uuid,
  profile_display_name text,
  avatar_url text,
  has_signed_up boolean,
  roster_ready boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_organizer_session() then
    return;
  end if;

  return query
  select
    ae.email,
    ae.display_name as invite_display_name,
    ae.is_organizer,
    p.id as user_id,
    p.display_name as profile_display_name,
    p.avatar_url,
    (p.id is not null) as has_signed_up,
    (
      p.id is not null
      and btrim(coalesce(p.display_name, '')) <> ''
      and btrim(coalesce(p.avatar_url, '')) <> ''
    ) as roster_ready
  from public.allowed_emails ae
  left join public.profiles p on lower(trim(p.email)) = ae.email
  order by ae.email asc;
end;
$$;

revoke all on function public.admin_allowlist_overview() from public;
grant execute on function public.admin_allowlist_overview() to authenticated;

-- ── Recent notes for curation (feature / unfeature)
create or replace function public.admin_notes_for_feature(p_limit int default 100)
returns table (
  note_id uuid,
  campaign_date date,
  body_preview text,
  author_display_name text,
  recipient_display_name text,
  is_featured boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := least(greatest(coalesce(p_limit, 100), 1), 200);
begin
  if not public.is_organizer_session() then
    return;
  end if;

  return query
  select
    dn.id as note_id,
    dn.campaign_date,
    substring(dn.body from 1 for 200) as body_preview,
    coalesce(nullif(trim(pa.display_name), ''), pa.email, '—') as author_display_name,
    coalesce(nullif(trim(pr.display_name), ''), pr.email, '—') as recipient_display_name,
    (fdn.id is not null) as is_featured,
    dn.created_at
  from public.daily_notes dn
  left join public.profiles pa on pa.id = dn.author_id
  left join public.profiles pr on pr.id = dn.recipient_id
  left join public.featured_daily_notes fdn on fdn.daily_note_id = dn.id
  order by dn.created_at desc
  limit lim;
end;
$$;

revoke all on function public.admin_notes_for_feature(int) from public;
grant execute on function public.admin_notes_for_feature(int) to authenticated;

-- ── Feature a note (idempotent)
create or replace function public.admin_feature_daily_note(p_note_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_organizer_session() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if not exists (select 1 from public.daily_notes where id = p_note_id) then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  insert into public.featured_daily_notes (daily_note_id, featured_by)
  values (p_note_id, v_uid)
  on conflict (daily_note_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_feature_daily_note(uuid) from public;
grant execute on function public.admin_feature_daily_note(uuid) to authenticated;

-- ── Unfeature
create or replace function public.admin_unfeature_daily_note(p_note_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_organizer_session() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  delete from public.featured_daily_notes where daily_note_id = p_note_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_unfeature_daily_note(uuid) from public;
grant execute on function public.admin_unfeature_daily_note(uuid) to authenticated;
