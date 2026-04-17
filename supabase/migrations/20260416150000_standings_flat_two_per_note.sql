-- Flat points formula: every daily note is worth 2 points regardless of
-- whether it is the author's first note to that recipient or a repeat.
--
-- Supersedes the previous formula that awarded 2 pts for a first-time
-- recipient and 1 pt for repeats (stored as `count(*) + count(distinct recipient_id)`).
-- New formula: `count(*) * 2`.
--
-- Everything else about the function (roster filter, dense ranking, streak
-- logic, payload shape) is left unchanged so the frontend keeps working
-- without modification.

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
    author_points as (
      select
        dn.author_id,
        -- Flat 2 points per note. Repeats are rewarded equally with first-time
        -- recipients so members are not penalised for continuing to thank the
        -- same person.
        (count(*) * 2)::bigint as pts
      from public.daily_notes dn
      group by dn.author_id
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
