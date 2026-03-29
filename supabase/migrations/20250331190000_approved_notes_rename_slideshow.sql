-- Rename featured → approved (terminology). Replace RPCs. Add home slideshow sample for allowlisted users.

do $migration$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'featured_daily_notes'
  ) then
    alter table public.featured_daily_notes rename to approved_daily_notes;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'approved_daily_notes' and column_name = 'featured_at'
  ) then
    alter table public.approved_daily_notes rename column featured_at to approved_at;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'approved_daily_notes' and column_name = 'featured_by'
  ) then
    alter table public.approved_daily_notes rename column featured_by to approved_by;
  end if;
end
$migration$;

-- Index / constraint names (best-effort; ignore if already renamed)
alter index if exists public.featured_daily_notes_featured_at_desc
  rename to approved_daily_notes_approved_at_desc;

do $c$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'approved_daily_notes'
  ) then
    alter table public.approved_daily_notes
      rename constraint featured_daily_notes_one_per_note to approved_daily_notes_one_per_note;
  end if;
exception
  when undefined_object then null;
  when duplicate_object then null;
end
$c$;

-- Replace admin RPCs
drop function if exists public.admin_notes_for_feature(int);
drop function if exists public.admin_feature_daily_note(uuid);
drop function if exists public.admin_unfeature_daily_note(uuid);

create or replace function public.admin_notes_for_approval(p_limit int default 100)
returns table (
  note_id uuid,
  campaign_date date,
  body_preview text,
  author_display_name text,
  recipient_display_name text,
  is_approved boolean,
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
    (adn.id is not null) as is_approved,
    dn.created_at
  from public.daily_notes dn
  left join public.profiles pa on pa.id = dn.author_id
  left join public.profiles pr on pr.id = dn.recipient_id
  left join public.approved_daily_notes adn on adn.daily_note_id = dn.id
  order by dn.created_at desc
  limit lim;
end;
$$;

revoke all on function public.admin_notes_for_approval(int) from public;
grant execute on function public.admin_notes_for_approval(int) to authenticated;

create or replace function public.admin_approve_daily_note(p_note_id uuid)
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

  insert into public.approved_daily_notes (daily_note_id, approved_by)
  values (p_note_id, v_uid)
  on conflict (daily_note_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_approve_daily_note(uuid) from public;
grant execute on function public.admin_approve_daily_note(uuid) to authenticated;

create or replace function public.admin_disapprove_daily_note(p_note_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_organizer_session() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  delete from public.approved_daily_notes where daily_note_id = p_note_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_disapprove_daily_note(uuid) from public;
grant execute on function public.admin_disapprove_daily_note(uuid) to authenticated;

-- Random approved notes for home carousel (allowlisted members)
create or replace function public.approved_notes_slideshow_random(p_limit int default 5)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := least(greatest(coalesce(p_limit, 5), 1), 15);
  result jsonb;
begin
  if not public.is_allowlisted_session() then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'note_id', x.note_id,
        'body', x.body,
        'recipient_display_name', x.recipient_display_name,
        'recipient_avatar_url', x.recipient_avatar_url
      )
      order by x.sort_key
    ),
    '[]'::jsonb
  )
  into result
  from (
    select
      dn.id as note_id,
      dn.body,
      coalesce(nullif(trim(pr.display_name), ''), pr.email, '') as recipient_display_name,
      coalesce(nullif(trim(pr.avatar_url), ''), '') as recipient_avatar_url,
      w.sort_key
    from (
      select adn.daily_note_id, random() as sort_key
      from public.approved_daily_notes adn
      order by random()
      limit lim
    ) w
    inner join public.daily_notes dn on dn.id = w.daily_note_id
    left join public.profiles pr on pr.id = dn.recipient_id
  ) x;

  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.approved_notes_slideshow_random(int) from public;
grant execute on function public.approved_notes_slideshow_random(int) to authenticated;
