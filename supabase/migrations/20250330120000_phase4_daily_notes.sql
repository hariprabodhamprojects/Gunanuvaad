-- Phase 4: one appreciation note per author per campaign day; recipient repeat lock (K distinct others).
-- Campaign calendar day uses Asia/Kolkata — keep in sync with lib/campaign-spec.ts CAMPAIGN_TIMEZONE.
-- K = 25 — keep in sync with lib/campaign-spec.ts RECIPIENT_LOCK_K.

create table if not exists public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  campaign_date date not null,
  created_at timestamptz not null default now(),
  constraint daily_notes_no_self check (author_id <> recipient_id),
  constraint daily_notes_body_len check (char_length(body) >= 1 and char_length(body) <= 4000)
);

create unique index if not exists daily_notes_one_per_author_day
  on public.daily_notes (author_id, campaign_date);

create index if not exists daily_notes_author_recipient_created
  on public.daily_notes (author_id, recipient_id, created_at desc);

alter table public.daily_notes enable row level security;

create policy "daily_notes_select_author"
  on public.daily_notes
  for select
  to authenticated
  using (author_id = auth.uid());

revoke all on public.daily_notes from public;
grant select on public.daily_notes to authenticated;

-- ── recipient_write_eligibility(p_recipient_id) → jsonb
create or replace function public.recipient_write_eligibility(p_recipient_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_campaign_date date;
  v_last timestamptz;
  v_cnt int;
  v_k int := 25;
begin
  if v_uid is null or not public.is_allowlisted_session() then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  if p_recipient_id = v_uid then
    return jsonb_build_object('ok', false, 'code', 'self');
  end if;

  if not exists (
    select 1
    from public.profiles p
    inner join public.allowed_emails ae on ae.email = p.email
    where p.id = p_recipient_id
      and btrim(coalesce(p.display_name, '')) <> ''
      and btrim(coalesce(p.avatar_url, '')) <> ''
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_recipient');
  end if;

  v_campaign_date := (timezone('Asia/Kolkata', now()))::date;

  if exists (
    select 1
    from public.daily_notes
    where author_id = v_uid
      and campaign_date = v_campaign_date
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_today');
  end if;

  select max(created_at) into v_last
  from public.daily_notes
  where author_id = v_uid
    and recipient_id = p_recipient_id;

  if v_last is null then
    return jsonb_build_object('ok', true, 'code', 'eligible');
  end if;

  select count(distinct recipient_id) into v_cnt
  from public.daily_notes
  where author_id = v_uid
    and created_at > v_last
    and recipient_id <> p_recipient_id;

  if v_cnt >= v_k then
    return jsonb_build_object('ok', true, 'code', 'eligible');
  end if;

  return jsonb_build_object(
    'ok', false,
    'code', 'recipient_locked',
    'need_more', v_k - v_cnt
  );
end;
$$;

revoke all on function public.recipient_write_eligibility(uuid) from public;
grant execute on function public.recipient_write_eligibility(uuid) to authenticated;

-- ── submit_daily_note(p_recipient_id, p_body) → jsonb
create or replace function public.submit_daily_note(p_recipient_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_elig jsonb;
  v_body text := trim(p_body);
  v_campaign_date date;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  v_elig := public.recipient_write_eligibility(p_recipient_id);
  if not coalesce((v_elig->>'ok')::boolean, false) then
    return v_elig;
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_body');
  end if;

  v_campaign_date := (timezone('Asia/Kolkata', now()))::date;

  insert into public.daily_notes (author_id, recipient_id, body, campaign_date)
  values (v_uid, p_recipient_id, v_body, v_campaign_date)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'already_today');
end;
$$;

revoke all on function public.submit_daily_note(uuid, text) from public;
grant execute on function public.submit_daily_note(uuid, text) to authenticated;
