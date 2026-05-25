-- Daily notes: 1 point per note row. Swadhyay unchanged (+2 per distinct
-- campaign_date with a qualifying non-revoked post on a published topic).
-- Supersedes daily-note scoring in 20260501130000_unlimited_daily_writes_single_daily_point.sql.

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
    note_points as (
      select dn.author_id, count(*)::bigint as pts
      from public.daily_notes dn
      group by dn.author_id
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
