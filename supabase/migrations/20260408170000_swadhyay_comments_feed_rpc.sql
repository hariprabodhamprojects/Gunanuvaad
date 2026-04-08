-- Swadhyay comments feed with profile/invite fallback names.
-- SECURITY DEFINER avoids profile RLS limiting names to only the viewer.

create or replace function public.swadhyay_comments_for_topic(p_topic_id uuid)
returns table (
  id uuid,
  topic_id uuid,
  author_id uuid,
  parent_comment_id uuid,
  body text,
  is_deleted boolean,
  created_at timestamptz,
  updated_at timestamptz,
  author_display_name text,
  author_avatar_url text,
  reaction_count int,
  viewer_reacted boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_allowlisted_session() then
    return;
  end if;

  return query
  with base as (
    select c.*
    from public.swadhyay_comments c
    inner join public.swadhyay_topics t on t.id = c.topic_id
    where c.topic_id = p_topic_id
      and (t.is_published = true or public.is_organizer_session())
  ),
  rx as (
    select r.comment_id, count(*)::int as cnt
    from public.swadhyay_comment_reactions r
    inner join base b on b.id = r.comment_id
    group by r.comment_id
  ),
  me as (
    select r.comment_id
    from public.swadhyay_comment_reactions r
    inner join base b on b.id = r.comment_id
    where r.user_id = v_uid
  )
  select
    b.id,
    b.topic_id,
    b.author_id,
    b.parent_comment_id,
    b.body,
    b.is_deleted,
    b.created_at,
    b.updated_at,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(ae.display_name), ''),
      'Member'
    ) as author_display_name,
    coalesce(nullif(trim(p.avatar_url), ''), '/logo.png') as author_avatar_url,
    coalesce(rx.cnt, 0) as reaction_count,
    (me.comment_id is not null) as viewer_reacted
  from base b
  left join public.profiles p on p.id = b.author_id
  left join public.allowed_emails ae on ae.email = lower(p.email)
  left join rx on rx.comment_id = b.id
  left join me on me.comment_id = b.id
  order by b.created_at asc;
end;
$$;

revoke all on function public.swadhyay_comments_for_topic(uuid) from public;
grant execute on function public.swadhyay_comments_for_topic(uuid) to authenticated;
