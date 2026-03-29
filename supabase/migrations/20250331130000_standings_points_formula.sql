-- Points: first note from an author to a given recipient = 2; each later note to that recipient = 1.
-- Total per author = sum_recipient (2 + (n_r-1)) = (sum n_r) + (#recipients) = note_count + distinct_recipients.

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
        count(*)::bigint + count(distinct dn.recipient_id)::bigint as pts
      from public.daily_notes dn
      group by dn.author_id
    ),
    point_rows as (
      select
        r.id,
        r.display_name,
        r.avatar_url,
        coalesce(ap.pts, 0)::bigint as score,
        row_number() over (
          order by coalesce(ap.pts, 0) desc, r.display_name asc
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
