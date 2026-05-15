-- Home "Community Spotlight": 2 random approved notes + 2 Smruti posts (with first image) +
-- 2 Swadhyay posts from the last 7 days (published topic, not revoked). Interleaved order.

create or replace function public.community_spotlight_random()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  slides jsonb := '[]'::jsonb;
  v_note1 jsonb;
  v_note2 jsonb;
  v_sm1 jsonb;
  v_sm2 jsonb;
  v_sw1 jsonb;
  v_sw2 jsonb;
  v_note1_id uuid;
  v_sm1_id uuid;
  v_sw1_id uuid;
begin
  if not public.is_allowlisted_session() then
    return '[]'::jsonb;
  end if;

  -- Note 1
  select
    jsonb_build_object(
      'kind', 'note',
      'id', dn.id,
      'body', left(trim(dn.body), 520),
      'recipient_display_name', coalesce(nullif(trim(pr.display_name), ''), pr.email, ''),
      'recipient_avatar_url', coalesce(nullif(trim(pr.avatar_url), ''), '')
    ),
    dn.id
  into v_note1, v_note1_id
  from public.approved_daily_notes adn
  inner join public.daily_notes dn on dn.id = adn.daily_note_id
  left join public.profiles pr on pr.id = dn.recipient_id
  order by random()
  limit 1;

  -- Smruti 1 (must have at least one media row)
  select
    jsonb_build_object(
      'kind', 'smruti',
      'id', p.id,
      'caption', left(trim(p.caption), 320),
      'author_display_name', coalesce(nullif(trim(pa.display_name), ''), pa.email, ''),
      'author_avatar_url', coalesce(nullif(trim(pa.avatar_url), ''), ''),
      'storage_path', (
        select m.storage_path
        from public.smruti_post_media m
        where m.post_id = p.id
        order by m.sort_order asc
        limit 1
      )
    ),
    p.id
  into v_sm1, v_sm1_id
  from public.smruti_posts p
  left join public.profiles pa on pa.id = p.author_id
  where exists (
    select 1 from public.smruti_post_media m where m.post_id = p.id
  )
  order by random()
  limit 1;

  -- Swadhyay 1 (last 7 days, published topic, not revoked)
  select
    jsonb_build_object(
      'kind', 'swadhyay',
      'id', sp.id,
      'body', left(trim(sp.body), 480),
      'topic_title', t.title,
      'author_display_name', coalesce(nullif(trim(pa.display_name), ''), pa.email, ''),
      'author_avatar_url', coalesce(nullif(trim(pa.avatar_url), ''), '')
    ),
    sp.id
  into v_sw1, v_sw1_id
  from public.swadhyay_posts sp
  inner join public.swadhyay_topics t on t.id = sp.topic_id
  left join public.profiles pa on pa.id = sp.author_id
  where sp.created_at >= (now() at time zone 'utc') - interval '7 days'
    and sp.is_revoked = false
    and t.is_published = true
  order by random()
  limit 1;

  -- Note 2 (different id)
  select jsonb_build_object(
    'kind', 'note',
    'id', dn.id,
    'body', left(trim(dn.body), 520),
    'recipient_display_name', coalesce(nullif(trim(pr.display_name), ''), pr.email, ''),
    'recipient_avatar_url', coalesce(nullif(trim(pr.avatar_url), ''), '')
  )
  into v_note2
  from public.approved_daily_notes adn
  inner join public.daily_notes dn on dn.id = adn.daily_note_id
  left join public.profiles pr on pr.id = dn.recipient_id
  where (v_note1_id is null or dn.id <> v_note1_id)
  order by random()
  limit 1;

  -- Smruti 2
  select jsonb_build_object(
    'kind', 'smruti',
    'id', p.id,
    'caption', left(trim(p.caption), 320),
    'author_display_name', coalesce(nullif(trim(pa.display_name), ''), pa.email, ''),
    'author_avatar_url', coalesce(nullif(trim(pa.avatar_url), ''), ''),
    'storage_path', (
      select m.storage_path
      from public.smruti_post_media m
      where m.post_id = p.id
      order by m.sort_order asc
      limit 1
    )
  )
  into v_sm2
  from public.smruti_posts p
  left join public.profiles pa on pa.id = p.author_id
  where exists (select 1 from public.smruti_post_media m where m.post_id = p.id)
    and (v_sm1_id is null or p.id <> v_sm1_id)
  order by random()
  limit 1;

  -- Swadhyay 2
  select jsonb_build_object(
    'kind', 'swadhyay',
    'id', sp.id,
    'body', left(trim(sp.body), 480),
    'topic_title', t.title,
    'author_display_name', coalesce(nullif(trim(pa.display_name), ''), pa.email, ''),
    'author_avatar_url', coalesce(nullif(trim(pa.avatar_url), ''), '')
  )
  into v_sw2
  from public.swadhyay_posts sp
  inner join public.swadhyay_topics t on t.id = sp.topic_id
  left join public.profiles pa on pa.id = sp.author_id
  where sp.created_at >= (now() at time zone 'utc') - interval '7 days'
    and sp.is_revoked = false
    and t.is_published = true
    and (v_sw1_id is null or sp.id <> v_sw1_id)
  order by random()
  limit 1;

  -- Interleave: note, smruti, swadhyay × 2
  if v_note1 is not null then slides := slides || jsonb_build_array(v_note1); end if;
  if v_sm1 is not null then slides := slides || jsonb_build_array(v_sm1); end if;
  if v_sw1 is not null then slides := slides || jsonb_build_array(v_sw1); end if;
  if v_note2 is not null then slides := slides || jsonb_build_array(v_note2); end if;
  if v_sm2 is not null then slides := slides || jsonb_build_array(v_sm2); end if;
  if v_sw2 is not null then slides := slides || jsonb_build_array(v_sw2); end if;

  return slides;
end;
$$;

revoke all on function public.community_spotlight_random() from public;
grant execute on function public.community_spotlight_random() to authenticated;

-- Realtime: refresh home spotlight when Smruti content changes (optional if not already added).
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'smruti_posts'
    ) then
      alter publication supabase_realtime add table public.smruti_posts;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'smruti_post_media'
    ) then
      alter publication supabase_realtime add table public.smruti_post_media;
    end if;
  end if;
end
$pub$;
