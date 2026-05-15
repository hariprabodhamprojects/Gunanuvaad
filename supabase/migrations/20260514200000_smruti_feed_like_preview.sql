-- Smruti feed: include up to 3 liker avatars (for Glimpses-style like row).

create or replace function public.smruti_feed_page(p_limit int default 30, p_before timestamptz default null)
returns jsonb
language sql
volatile
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(q.payload order by q.sort_key desc),
    '[]'::jsonb
  )
  from (
    select
      po.created_at as sort_key,
      jsonb_build_object(
        'id', po.id,
        'author_id', po.author_id,
        'caption', po.caption,
        'created_at', po.created_at,
        'author_display_name', pr.display_name,
        'author_avatar_url', pr.avatar_url,
        'media', coalesce(m.media, '[]'::jsonb),
        'like_count', coalesce(lc.cnt, 0),
        'liked_by_me', (lk.user_id is not null),
        'like_preview', coalesce(lp.like_preview, '[]'::jsonb)
      ) as payload
    from (
      select sp.*
      from public.smruti_posts sp
      where public.is_allowlisted_session()
        and (p_before is null or sp.created_at < p_before)
      order by sp.created_at desc
      limit greatest(1, least(coalesce(nullif(p_limit, 0), 30), 100))
    ) po
    left join public.profiles pr on pr.id = po.author_id
    left join lateral (
      select jsonb_agg(
        jsonb_build_object('sort_order', mm.sort_order, 'storage_path', mm.storage_path)
        order by mm.sort_order
      ) as media
      from public.smruti_post_media mm
      where mm.post_id = po.id
    ) m on true
    left join lateral (
      select count(*)::int as cnt
      from public.smruti_likes ll
      where ll.post_id = po.id
    ) lc on true
    left join lateral (
      select lme.user_id
      from public.smruti_likes lme
      where lme.post_id = po.id
        and lme.user_id = auth.uid()
      limit 1
    ) lk on true
    left join lateral (
      select coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'avatar_url', prx.avatar_url,
              'display_name', prx.display_name
            )
            order by s.created_at asc
          )
          from (
            select lq.user_id, lq.created_at
            from public.smruti_likes lq
            where lq.post_id = po.id
            order by lq.created_at asc
            limit 3
          ) s
          inner join public.profiles prx on prx.id = s.user_id
        ),
        '[]'::jsonb
      ) as like_preview
    ) lp on true
  ) q;
$$;

comment on function public.smruti_feed_page(int, timestamptz) is
  'Allowlisted Smruti feed: posts with media, like_count, liked_by_me, and like_preview (up to 3 earliest likers'' avatars).';
