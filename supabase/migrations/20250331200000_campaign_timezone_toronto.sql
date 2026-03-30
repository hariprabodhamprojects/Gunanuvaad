-- Align campaign calendar day with `lib/campaign-spec.ts` CAMPAIGN_TIMEZONE (`America/Toronto`).
-- Run after phase 4. One shared zone for the whole group so UI + `submit_daily_note` stay in sync.

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

  v_campaign_date := (timezone('America/Toronto', now()))::date;

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

  v_campaign_date := (timezone('America/Toronto', now()))::date;

  insert into public.daily_notes (author_id, recipient_id, body, campaign_date)
  values (v_uid, p_recipient_id, v_body, v_campaign_date)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'already_today');
end;
$$;
