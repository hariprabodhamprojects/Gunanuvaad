-- Allow unlimited daily note writes per day while awarding points only once
-- per campaign day. Swadhyay already scores once/day via distinct
-- (author_id, campaign_date) and remains unchanged.

-- Remove hard one-note/day write lock at the table level.
drop index if exists public.daily_notes_one_per_author_day;

-- Keep an index that supports day-based reads without enforcing uniqueness.
create index if not exists daily_notes_author_campaign_date_created
  on public.daily_notes (author_id, campaign_date, created_at desc);

-- Allowlisted users can write multiple notes per day.
create or replace function public.recipient_write_eligibility(
  p_recipient_id uuid default null,
  p_recipient_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target_id uuid;
  v_target_email text;
  v_my_email text;
begin
  if v_uid is null or not public.is_allowlisted_session() then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  select lower(p.email) into v_my_email
  from public.profiles p
  where p.id = v_uid;

  if p_recipient_id is not null then
    select p.id, lower(p.email)
      into v_target_id, v_target_email
    from public.profiles p
    inner join public.allowed_emails ae on ae.email = lower(p.email)
    where p.id = p_recipient_id
    limit 1;
  elsif nullif(trim(coalesce(p_recipient_email, '')), '') is not null then
    select p.id, ae.email
      into v_target_id, v_target_email
    from public.allowed_emails ae
    left join public.profiles p on lower(p.email) = ae.email
    where ae.email = lower(trim(p_recipient_email))
    limit 1;
  end if;

  if v_target_email is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_recipient');
  end if;

  if (v_target_id is not null and v_target_id = v_uid)
     or (v_my_email is not null and v_target_email = v_my_email) then
    return jsonb_build_object('ok', false, 'code', 'self');
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', 'eligible',
    'recipient_id', v_target_id,
    'recipient_email', v_target_email
  );
end;
$$;

revoke all on function public.recipient_write_eligibility(uuid, text) from public;
grant execute on function public.recipient_write_eligibility(uuid, text) to authenticated;

-- Keep submit logic in sync and remove stale "already_today" conflict mapping.
create or replace function public.submit_daily_note(
  p_recipient_id uuid default null,
  p_recipient_email text default null,
  p_body text default ''
)
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
  v_target_id uuid;
  v_target_email text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  v_elig := public.recipient_write_eligibility(p_recipient_id, p_recipient_email);
  if not coalesce((v_elig->>'ok')::boolean, false) then
    return v_elig;
  end if;

  if char_length(v_body) < 30 or char_length(v_body) > 4000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_body');
  end if;

  v_target_id := nullif(v_elig->>'recipient_id', '')::uuid;
  v_target_email := lower(coalesce(v_elig->>'recipient_email', ''));
  v_campaign_date := (timezone('America/Toronto', now()))::date;

  insert into public.daily_notes (author_id, recipient_id, recipient_email, body, campaign_date)
  values (v_uid, v_target_id, v_target_email, v_body, v_campaign_date)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'conflict');
end;
$$;

revoke all on function public.submit_daily_note(uuid, text, text) from public;
grant execute on function public.submit_daily_note(uuid, text, text) to authenticated;

-- Standings: Daily notes count once per campaign day (not per row).
create or replace function public.standings_leaderboards()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_allowlisted_session() then
    return 'null'::jsonb;
  end if;

  return (
    with roster as (
      select p.id, p.display_name, p.avatar_url
      from public.profiles p
      inner join public.allowed_emails ae on ae.email = lower(trim(p.email))
      where btrim(coalesce(p.display_name, '')) <> ''
        and btrim(coalesce(p.avatar_url, '')) <> ''
    ),
    note_days as (
      select distinct dn.author_id, dn.campaign_date
      from public.daily_notes dn
    ),
    note_points as (
      select nd.author_id, (count(*) * 2)::bigint as pts
      from note_days nd
      group by nd.author_id
    ),
    swadhyay_days as (
      select distinct sp.author_id, sp.campaign_date
      from public.swadhyay_posts sp
      inner join public.swadhyay_topics t on t.id = sp.topic_id
      where sp.is_revoked = false
        and t.is_published = true
        and sp.campaign_date between t.start_date and t.end_date
    ),
    swadhyay_points as (
      select author_id, (count(*) * 2)::bigint as pts
      from swadhyay_days
      group by author_id
    ),
    author_points as (
      select
        r.id as author_id,
        (coalesce(np.pts, 0) + coalesce(sp.pts, 0))::bigint as pts
      from roster r
      left join note_points np on np.author_id = r.id
      left join swadhyay_points sp on sp.author_id = r.id
    ),
    point_rows as (
      select
        r.id,
        r.display_name,
        r.avatar_url,
        coalesce(ap.pts, 0)::bigint as score,
        dense_rank() over (
          order by coalesce(ap.pts, 0) desc
        ) as rank
      from roster r
      left join author_points ap on ap.author_id = r.id
    ),
    streak_raw as (
      select
        r.id,
        r.display_name,
        r.avatar_url,
        public._streak_days_for_author(r.id) as streak
      from roster r
    ),
    streak_rows as (
      select
        *,
        dense_rank() over (
          order by streak desc
        ) as rank
      from streak_raw
    )
    select jsonb_build_object(
      'points',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'rank', pr.rank,
              'id', pr.id,
              'display_name', pr.display_name,
              'avatar_url', pr.avatar_url,
              'score', pr.score
            )
            order by pr.rank, pr.display_name
          )
          from point_rows pr
        ),
        '[]'::jsonb
      ),
      'streaks',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'rank', sr.rank,
              'id', sr.id,
              'display_name', sr.display_name,
              'avatar_url', sr.avatar_url,
              'streak', sr.streak
            )
            order by sr.rank, sr.display_name
          )
          from streak_rows sr
        ),
        '[]'::jsonb
      ),
      'viewer_id', to_jsonb(v_uid)
    )
  );
end;
$$;

revoke all on function public.standings_leaderboards() from public;
grant execute on function public.standings_leaderboards() to authenticated;
