-- Spotlight + approved carousel: show allowlist/profile display_name only.
-- First + last live in allowed_emails.display_name (and profiles.display_name after signup).
-- Never fall back to email addresses in the UI.

create or replace function public.invite_display_name_for_email(p_email text)
returns text
language sql
stable
set search_path = public
as $$
  select nullif(trim(ae.display_name), '')
  from public.allowed_emails ae
  where nullif(trim(p_email), '') is not null
    and ae.email = lower(trim(p_email))
  limit 1;
$$;

create or replace function public.community_spotlight_random()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  slides jsonb := '[]'::jsonb;
  v_note1 jsonb;
  v_note2 jsonb;
  v_sm1 jsonb;
  v_sm2 jsonb;
  v_sw1 jsonb;
  v_sw2 jsonb;
  v_note1_id uuid;
  v_note2_id uuid;
  v_sm1_id uuid;
  v_sm2_id uuid;
  v_sw1_id uuid;
  v_sw2_id uuid;
  v_n_notes int := 0;
  v_n_sm int := 0;
  v_n_sw int := 0;
  v_decks int := 1;
  v_deck int := 0;
  v_off int := 0;
begin
  if not public.is_allowlisted_session() or v_uid is null then
    return '[]'::jsonb;
  end if;

  select coalesce(p.community_spotlight_deck_index, 0)::int
  into v_deck
  from public.profiles p
  where p.id = v_uid;

  select count(*)::int into v_n_notes
  from public.approved_daily_notes adn
  inner join public.daily_notes dn on dn.id = adn.daily_note_id;

  select count(*)::int into v_n_sm
  from public.smruti_posts p
  where exists (select 1 from public.smruti_post_media m where m.post_id = p.id);

  select count(*)::int into v_n_sw
  from public.swadhyay_posts sp
  inner join public.swadhyay_topics t on t.id = sp.topic_id
  where sp.created_at >= (now() at time zone 'utc') - interval '7 days'
    and sp.is_revoked = false
    and t.is_published = true;

  v_decks := greatest(
    1,
    case when v_n_notes > 0 then ((v_n_notes + 1) / 2) else 1 end,
    case when v_n_sm > 0 then ((v_n_sm + 1) / 2) else 1 end,
    case when v_n_sw > 0 then ((v_n_sw + 1) / 2) else 1 end
  );

  v_deck := v_deck % v_decks;
  v_off := v_deck * 2;

  select
    jsonb_build_object(
      'kind', 'note',
      'id', dn.id,
      'body', left(trim(dn.body), 520),
      'recipient_display_name', coalesce(
        nullif(trim(pr.display_name), ''),
        nullif(trim(pr_e.display_name), ''),
        public.invite_display_name_for_email(dn.recipient_email),
        public.invite_display_name_for_email(pr.email),
        public.invite_display_name_for_email(pr_e.email),
        ''
      ),
      'recipient_avatar_url', coalesce(
        nullif(trim(pr.avatar_url), ''),
        nullif(trim(pr_e.avatar_url), ''),
        '/logo.png'
      )
    ),
    dn.id
  into v_note1, v_note1_id
  from public.approved_daily_notes adn
  inner join public.daily_notes dn on dn.id = adn.daily_note_id
  left join public.profiles pr on pr.id = dn.recipient_id
  left join public.profiles pr_e
    on nullif(trim(dn.recipient_email), '') is not null
    and lower(trim(pr_e.email)) = lower(trim(dn.recipient_email))
  order by adn.approved_at desc nulls last, dn.created_at desc
  offset case when v_n_notes > 0 then (v_off % v_n_notes) else 0 end
  limit 1;

  if v_n_notes > 0 then
    select
      jsonb_build_object(
        'kind', 'note',
        'id', dn.id,
        'body', left(trim(dn.body), 520),
        'recipient_display_name', coalesce(
          nullif(trim(pr.display_name), ''),
          nullif(trim(pr_e.display_name), ''),
          public.invite_display_name_for_email(dn.recipient_email),
          public.invite_display_name_for_email(pr.email),
          public.invite_display_name_for_email(pr_e.email),
          ''
        ),
        'recipient_avatar_url', coalesce(
          nullif(trim(pr.avatar_url), ''),
          nullif(trim(pr_e.avatar_url), ''),
          '/logo.png'
        )
      ),
      dn.id
    into v_note2, v_note2_id
    from public.approved_daily_notes adn
    inner join public.daily_notes dn on dn.id = adn.daily_note_id
    left join public.profiles pr on pr.id = dn.recipient_id
    left join public.profiles pr_e
      on nullif(trim(dn.recipient_email), '') is not null
      and lower(trim(pr_e.email)) = lower(trim(dn.recipient_email))
    order by adn.approved_at desc nulls last, dn.created_at desc
    offset ((v_off + 1) % v_n_notes)
    limit 1;

    if v_note2_id is not null and v_note2_id = v_note1_id and v_n_notes > 1 then
      select
        jsonb_build_object(
          'kind', 'note',
          'id', dn.id,
          'body', left(trim(dn.body), 520),
          'recipient_display_name', coalesce(
            nullif(trim(pr.display_name), ''),
            nullif(trim(pr_e.display_name), ''),
            public.invite_display_name_for_email(dn.recipient_email),
            public.invite_display_name_for_email(pr.email),
            public.invite_display_name_for_email(pr_e.email),
            ''
          ),
          'recipient_avatar_url', coalesce(
            nullif(trim(pr.avatar_url), ''),
            nullif(trim(pr_e.avatar_url), ''),
            '/logo.png'
          )
        ),
        dn.id
      into v_note2, v_note2_id
      from public.approved_daily_notes adn
      inner join public.daily_notes dn on dn.id = adn.daily_note_id
      left join public.profiles pr on pr.id = dn.recipient_id
      left join public.profiles pr_e
        on nullif(trim(dn.recipient_email), '') is not null
        and lower(trim(pr_e.email)) = lower(trim(dn.recipient_email))
      order by adn.approved_at desc nulls last, dn.created_at desc
      offset ((v_off + 2) % v_n_notes)
      limit 1;
    end if;
  end if;

  select
    jsonb_build_object(
      'kind', 'smruti',
      'id', p.id,
      'caption', left(trim(p.caption), 320),
      'author_display_name', coalesce(nullif(trim(pa.display_name), ''), public.invite_display_name_for_email(pa.email), ''),
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
  where exists (select 1 from public.smruti_post_media m where m.post_id = p.id)
  order by p.created_at desc, p.id
  offset case when v_n_sm > 0 then (v_off % v_n_sm) else 0 end
  limit 1;

  if v_n_sm > 0 then
    select
      jsonb_build_object(
        'kind', 'smruti',
        'id', p.id,
        'caption', left(trim(p.caption), 320),
        'author_display_name', coalesce(nullif(trim(pa.display_name), ''), public.invite_display_name_for_email(pa.email), ''),
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
    into v_sm2, v_sm2_id
    from public.smruti_posts p
    left join public.profiles pa on pa.id = p.author_id
    where exists (select 1 from public.smruti_post_media m where m.post_id = p.id)
    order by p.created_at desc, p.id
    offset ((v_off + 1) % v_n_sm)
    limit 1;

    if v_sm2_id is not null and v_sm2_id = v_sm1_id and v_n_sm > 1 then
      select
        jsonb_build_object(
          'kind', 'smruti',
          'id', p.id,
          'caption', left(trim(p.caption), 320),
          'author_display_name', coalesce(nullif(trim(pa.display_name), ''), public.invite_display_name_for_email(pa.email), ''),
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
      into v_sm2, v_sm2_id
      from public.smruti_posts p
      left join public.profiles pa on pa.id = p.author_id
      where exists (select 1 from public.smruti_post_media m where m.post_id = p.id)
      order by p.created_at desc, p.id
      offset ((v_off + 2) % v_n_sm)
      limit 1;
    end if;
  end if;

  select
    jsonb_build_object(
      'kind', 'swadhyay',
      'id', sp.id,
      'body', left(trim(sp.body), 480),
      'topic_title', t.title,
      'author_display_name', coalesce(nullif(trim(pa.display_name), ''), public.invite_display_name_for_email(pa.email), ''),
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
  order by sp.created_at desc, sp.id
  offset case when v_n_sw > 0 then (v_off % v_n_sw) else 0 end
  limit 1;

  if v_n_sw > 0 then
    select
      jsonb_build_object(
        'kind', 'swadhyay',
        'id', sp.id,
        'body', left(trim(sp.body), 480),
        'topic_title', t.title,
        'author_display_name', coalesce(nullif(trim(pa.display_name), ''), public.invite_display_name_for_email(pa.email), ''),
        'author_avatar_url', coalesce(nullif(trim(pa.avatar_url), ''), '')
      ),
      sp.id
    into v_sw2, v_sw2_id
    from public.swadhyay_posts sp
    inner join public.swadhyay_topics t on t.id = sp.topic_id
    left join public.profiles pa on pa.id = sp.author_id
    where sp.created_at >= (now() at time zone 'utc') - interval '7 days'
      and sp.is_revoked = false
      and t.is_published = true
    order by sp.created_at desc, sp.id
    offset ((v_off + 1) % v_n_sw)
    limit 1;

    if v_sw2_id is not null and v_sw2_id = v_sw1_id and v_n_sw > 1 then
      select
        jsonb_build_object(
          'kind', 'swadhyay',
          'id', sp.id,
          'body', left(trim(sp.body), 480),
          'topic_title', t.title,
          'author_display_name', coalesce(nullif(trim(pa.display_name), ''), public.invite_display_name_for_email(pa.email), ''),
          'author_avatar_url', coalesce(nullif(trim(pa.avatar_url), ''), '')
        ),
        sp.id
      into v_sw2, v_sw2_id
      from public.swadhyay_posts sp
      inner join public.swadhyay_topics t on t.id = sp.topic_id
      left join public.profiles pa on pa.id = sp.author_id
      where sp.created_at >= (now() at time zone 'utc') - interval '7 days'
        and sp.is_revoked = false
        and t.is_published = true
      order by sp.created_at desc, sp.id
      offset ((v_off + 2) % v_n_sw)
      limit 1;
    end if;
  end if;

  if v_note1 is not null then slides := slides || jsonb_build_array(v_note1); end if;
  if v_sm1 is not null then slides := slides || jsonb_build_array(v_sm1); end if;
  if v_sw1 is not null then slides := slides || jsonb_build_array(v_sw1); end if;
  if v_note2 is not null then slides := slides || jsonb_build_array(v_note2); end if;
  if v_sm2 is not null then slides := slides || jsonb_build_array(v_sm2); end if;
  if v_sw2 is not null then slides := slides || jsonb_build_array(v_sw2); end if;

  return slides;
end;
$$;

-- Same name rules for the older approved-notes carousel RPC.
create or replace function public.approved_notes_slideshow_random(p_limit int default 5)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := least(greatest(coalesce(p_limit, 5), 1), 15);
  result jsonb;
begin
  if not public.is_allowlisted_session() then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'note_id', x.note_id,
        'body', x.body,
        'recipient_display_name', x.recipient_display_name,
        'recipient_avatar_url', x.recipient_avatar_url
      )
      order by x.sort_key
    ),
    '[]'::jsonb
  )
  into result
  from (
    select
      dn.id as note_id,
      dn.body,
      coalesce(
        nullif(trim(pr.display_name), ''),
        nullif(trim(pr_e.display_name), ''),
        public.invite_display_name_for_email(dn.recipient_email),
        public.invite_display_name_for_email(pr.email),
        public.invite_display_name_for_email(pr_e.email),
        ''
      ) as recipient_display_name,
      coalesce(
        nullif(trim(pr.avatar_url), ''),
        nullif(trim(pr_e.avatar_url), ''),
        '/logo.png'
      ) as recipient_avatar_url,
      w.sort_key
    from (
      select adn.daily_note_id, random() as sort_key
      from public.approved_daily_notes adn
      order by random()
      limit lim
    ) w
    inner join public.daily_notes dn on dn.id = w.daily_note_id
    left join public.profiles pr on pr.id = dn.recipient_id
    left join public.profiles pr_e
      on nullif(trim(dn.recipient_email), '') is not null
      and lower(trim(pr_e.email)) = lower(trim(dn.recipient_email))
  ) x;

  return coalesce(result, '[]'::jsonb);
end;
$$;

-- Backfill empty profile names from allowlist (first + last already stored there).
update public.profiles p
set display_name = nullif(trim(ae.display_name), ''),
    updated_at = now()
from public.allowed_emails ae
where lower(trim(p.email)) = ae.email
  and nullif(trim(ae.display_name), '') is not null
  and (p.display_name is null or trim(p.display_name) = '');

