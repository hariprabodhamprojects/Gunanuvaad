-- Phase 5: leaderboards from daily_notes (points = notes sent; streak = consecutive campaign days with a note).
-- Roster scope matches mosaic (allowlisted + complete profile). Viewer may appear in lists.

create or replace function public._streak_days_for_author(p_author uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d date;
  prev date;
  streak int := 0;
begin
  for d in
    select distinct dn.campaign_date
    from public.daily_notes dn
    where dn.author_id = p_author
    order by dn.campaign_date desc
  loop
    if streak = 0 then
      streak := 1;
      prev := d;
    elsif d = prev - 1 then
      streak := streak + 1;
      prev := d;
    else
      exit;
    end if;
  end loop;
  return streak;
end;
$$;

revoke all on function public._streak_days_for_author(uuid) from public;

-- One JSON payload: points + streak leaderboards (same roster ordering rules).
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
    point_rows as (
      select
        r.id,
        r.display_name,
        r.avatar_url,
        coalesce(n.cnt, 0)::bigint as score,
        row_number() over (
          order by coalesce(n.cnt, 0) desc, r.display_name asc
        ) as rank
      from roster r
      left join (
        select author_id, count(*)::bigint as cnt
        from public.daily_notes
        group by author_id
      ) n on n.author_id = r.id
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
        row_number() over (
          order by streak desc, display_name asc
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
            order by pr.rank
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
            order by sr.rank
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
