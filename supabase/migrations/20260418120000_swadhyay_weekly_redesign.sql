-- Swadhyay weekly redesign.
--
-- Shifts the Swadhyay feature from "admin writes one topic per day + users
-- comment on it" to "admin picks weekly themes + users post their own
-- reflections as many times as they want".
--
-- Scoring: a non-revoked post made on a campaign date that falls inside an
-- active published topic window grants that user 2 standings points for that
-- day, stacked on top of the existing 2 pts per daily_note.
--
-- The old phase-1/phase-2 schema (swadhyay_topics with one row per
-- campaign_date, swadhyay_comments with replies, swadhyay_comment_reactions)
-- is dropped. The project is still early-stage, so we do not migrate the
-- handful of existing rows.

-- ── 0. Required extensions ──────────────────────────────────────────────────
-- btree_gist lets us combine a boolean (`is_published`) into the GiST
-- exclusion index that forbids overlapping active topic windows.
create extension if not exists btree_gist;

-- ── 1. Drop old schema + helper functions ───────────────────────────────────
drop function if exists public.swadhyay_comments_for_topic(uuid);
drop table if exists public.swadhyay_comment_reactions cascade;
drop table if exists public.swadhyay_comments cascade;
drop table if exists public.swadhyay_topics cascade;

-- Realtime publication cleanup is handled automatically when the tables are
-- dropped, but re-adding below is guarded so this migration stays idempotent.

-- ── 2. New tables ───────────────────────────────────────────────────────────

create table public.swadhyay_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  start_date date not null,
  end_date date not null,
  is_published boolean not null default true,
  posted_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint swadhyay_topics_title_len check (char_length(trim(title)) between 1 and 200),
  constraint swadhyay_topics_description_len check (char_length(description) <= 12000),
  constraint swadhyay_topics_date_order check (end_date >= start_date),
  -- Published topic windows must never overlap so there is at most one
  -- "active" topic on any given campaign day. Unpublished/draft rows are
  -- excluded from the constraint, letting admins queue drafts freely.
  constraint swadhyay_topics_no_overlap exclude using gist (
    daterange(start_date, end_date, '[]') with &&
  ) where (is_published)
);

create index swadhyay_topics_start_idx
  on public.swadhyay_topics (start_date desc);

create table public.swadhyay_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.swadhyay_topics(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  -- Stamped at insert by a trigger so that scoring is cheap (no joins against
  -- created_at + timezone math). Matches daily_notes.campaign_date.
  campaign_date date not null,
  is_revoked boolean not null default false,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint swadhyay_posts_body_len check (char_length(trim(body)) between 1 and 4000),
  constraint swadhyay_posts_reason_len check (revoke_reason is null or char_length(revoke_reason) <= 500)
);

create index swadhyay_posts_topic_created_idx
  on public.swadhyay_posts (topic_id, created_at desc);

create index swadhyay_posts_author_day_idx
  on public.swadhyay_posts (author_id, campaign_date);

create table public.swadhyay_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.swadhyay_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_reply_id uuid references public.swadhyay_post_replies(id) on delete cascade,
  body text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint swadhyay_post_replies_body_len check (char_length(trim(body)) between 1 and 2000)
);

create index swadhyay_post_replies_post_created_idx
  on public.swadhyay_post_replies (post_id, created_at asc);

create index swadhyay_post_replies_parent_idx
  on public.swadhyay_post_replies (parent_reply_id, created_at asc);

create table public.swadhyay_post_reactions (
  post_id uuid not null references public.swadhyay_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.swadhyay_reply_reactions (
  reply_id uuid not null references public.swadhyay_post_replies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

-- ── 3. Triggers ─────────────────────────────────────────────────────────────
-- Stamp campaign_date using the same Toronto timezone pattern as
-- submit_daily_note() so standings math lines up day-for-day.
create or replace function public._swadhyay_posts_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.campaign_date is null then
    new.campaign_date := (timezone('America/Toronto', now()))::date;
  end if;
  return new;
end;
$$;

drop trigger if exists swadhyay_posts_before_insert on public.swadhyay_posts;
create trigger swadhyay_posts_before_insert
  before insert on public.swadhyay_posts
  for each row
  execute function public._swadhyay_posts_before_insert();

-- Only organizers may toggle the revocation columns. RLS already limits who
-- can update the row at all; this trigger prevents a malicious author from
-- flipping is_revoked=false on their own post (which RLS allows as a normal
-- edit inside the 15-minute window).
create or replace function public._swadhyay_posts_before_update()
returns trigger
language plpgsql
as $$
begin
  if (
    new.is_revoked is distinct from old.is_revoked
    or new.revoked_by is distinct from old.revoked_by
    or new.revoked_at is distinct from old.revoked_at
    or new.revoke_reason is distinct from old.revoke_reason
  ) and not public.is_organizer_session() then
    raise exception 'Only organizers may change revocation state.'
      using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists swadhyay_posts_before_update on public.swadhyay_posts;
create trigger swadhyay_posts_before_update
  before update on public.swadhyay_posts
  for each row
  execute function public._swadhyay_posts_before_update();

-- ── 4. RLS ──────────────────────────────────────────────────────────────────
alter table public.swadhyay_topics enable row level security;
alter table public.swadhyay_posts enable row level security;
alter table public.swadhyay_post_replies enable row level security;
alter table public.swadhyay_post_reactions enable row level security;
alter table public.swadhyay_reply_reactions enable row level security;

-- Topics
create policy "swadhyay_topics_select_allowlisted"
  on public.swadhyay_topics
  for select
  to authenticated
  using (
    public.is_allowlisted_session()
    and (is_published = true or public.is_organizer_session())
  );

create policy "swadhyay_topics_insert_organizer"
  on public.swadhyay_topics
  for insert
  to authenticated
  with check (public.is_organizer_session());

create policy "swadhyay_topics_update_organizer"
  on public.swadhyay_topics
  for update
  to authenticated
  using (public.is_organizer_session())
  with check (public.is_organizer_session());

create policy "swadhyay_topics_delete_organizer"
  on public.swadhyay_topics
  for delete
  to authenticated
  using (public.is_organizer_session());

-- Posts
create policy "swadhyay_posts_select_allowlisted"
  on public.swadhyay_posts
  for select
  to authenticated
  using (
    public.is_allowlisted_session()
    and exists (
      select 1
      from public.swadhyay_topics t
      where t.id = topic_id
        and (t.is_published = true or public.is_organizer_session())
    )
  );

create policy "swadhyay_posts_insert_allowlisted"
  on public.swadhyay_posts
  for insert
  to authenticated
  with check (
    public.is_allowlisted_session()
    and author_id = auth.uid()
    and is_revoked = false
    and revoked_by is null
    and revoked_at is null
    and revoke_reason is null
    and exists (
      select 1
      from public.swadhyay_topics t
      where t.id = topic_id
        and t.is_published = true
        and (timezone('America/Toronto', now()))::date between t.start_date and t.end_date
    )
  );

create policy "swadhyay_posts_update_own_15m_or_organizer"
  on public.swadhyay_posts
  for update
  to authenticated
  using (
    public.is_allowlisted_session()
    and (
      public.is_organizer_session()
      or (
        author_id = auth.uid()
        and created_at >= (now() - interval '15 minutes')
      )
    )
  )
  with check (
    public.is_allowlisted_session()
    and (
      public.is_organizer_session()
      or (
        author_id = auth.uid()
        and created_at >= (now() - interval '15 minutes')
      )
    )
  );

create policy "swadhyay_posts_delete_own_15m_or_organizer"
  on public.swadhyay_posts
  for delete
  to authenticated
  using (
    public.is_allowlisted_session()
    and (
      public.is_organizer_session()
      or (
        author_id = auth.uid()
        and created_at >= (now() - interval '15 minutes')
      )
    )
  );

-- Replies (same shape as old swadhyay_comments policies; see 20260408150000)
create policy "swadhyay_post_replies_select_allowlisted"
  on public.swadhyay_post_replies
  for select
  to authenticated
  using (
    public.is_allowlisted_session()
    and exists (
      select 1
      from public.swadhyay_posts p
      inner join public.swadhyay_topics t on t.id = p.topic_id
      where p.id = post_id
        and (t.is_published = true or public.is_organizer_session())
    )
  );

create policy "swadhyay_post_replies_insert_allowlisted"
  on public.swadhyay_post_replies
  for insert
  to authenticated
  with check (
    public.is_allowlisted_session()
    and author_id = auth.uid()
    and exists (
      select 1
      from public.swadhyay_posts p
      inner join public.swadhyay_topics t on t.id = p.topic_id
      where p.id = post_id
        and t.is_published = true
    )
  );

create policy "swadhyay_post_replies_update_own_15m_or_organizer"
  on public.swadhyay_post_replies
  for update
  to authenticated
  using (
    public.is_allowlisted_session()
    and (
      public.is_organizer_session()
      or (
        author_id = auth.uid()
        and created_at >= (now() - interval '15 minutes')
      )
    )
  )
  with check (
    public.is_allowlisted_session()
    and (
      public.is_organizer_session()
      or (
        author_id = auth.uid()
        and created_at >= (now() - interval '15 minutes')
      )
    )
  );

create policy "swadhyay_post_replies_delete_own_15m_or_organizer"
  on public.swadhyay_post_replies
  for delete
  to authenticated
  using (
    public.is_allowlisted_session()
    and (
      public.is_organizer_session()
      or (
        author_id = auth.uid()
        and created_at >= (now() - interval '15 minutes')
      )
    )
  );

-- Reactions (post + reply) — mirror swadhyay_comment_reactions policies.
create policy "swadhyay_post_reactions_select_allowlisted"
  on public.swadhyay_post_reactions
  for select
  to authenticated
  using (
    public.is_allowlisted_session()
    and exists (
      select 1
      from public.swadhyay_posts p
      inner join public.swadhyay_topics t on t.id = p.topic_id
      where p.id = post_id
        and (t.is_published = true or public.is_organizer_session())
    )
  );

create policy "swadhyay_post_reactions_insert_own"
  on public.swadhyay_post_reactions
  for insert
  to authenticated
  with check (
    public.is_allowlisted_session()
    and user_id = auth.uid()
    and exists (
      select 1
      from public.swadhyay_posts p
      inner join public.swadhyay_topics t on t.id = p.topic_id
      where p.id = post_id
        and t.is_published = true
    )
  );

create policy "swadhyay_post_reactions_delete_own"
  on public.swadhyay_post_reactions
  for delete
  to authenticated
  using (public.is_allowlisted_session() and user_id = auth.uid());

create policy "swadhyay_reply_reactions_select_allowlisted"
  on public.swadhyay_reply_reactions
  for select
  to authenticated
  using (
    public.is_allowlisted_session()
    and exists (
      select 1
      from public.swadhyay_post_replies r
      inner join public.swadhyay_posts p on p.id = r.post_id
      inner join public.swadhyay_topics t on t.id = p.topic_id
      where r.id = reply_id
        and (t.is_published = true or public.is_organizer_session())
    )
  );

create policy "swadhyay_reply_reactions_insert_own"
  on public.swadhyay_reply_reactions
  for insert
  to authenticated
  with check (
    public.is_allowlisted_session()
    and user_id = auth.uid()
    and exists (
      select 1
      from public.swadhyay_post_replies r
      inner join public.swadhyay_posts p on p.id = r.post_id
      inner join public.swadhyay_topics t on t.id = p.topic_id
      where r.id = reply_id
        and t.is_published = true
    )
  );

create policy "swadhyay_reply_reactions_delete_own"
  on public.swadhyay_reply_reactions
  for delete
  to authenticated
  using (public.is_allowlisted_session() and user_id = auth.uid());

-- ── 5. Grants ───────────────────────────────────────────────────────────────
revoke all on public.swadhyay_topics from public;
revoke all on public.swadhyay_posts from public;
revoke all on public.swadhyay_post_replies from public;
revoke all on public.swadhyay_post_reactions from public;
revoke all on public.swadhyay_reply_reactions from public;

grant select, insert, update, delete on public.swadhyay_topics to authenticated;
grant select, insert, update, delete on public.swadhyay_posts to authenticated;
grant select, insert, update, delete on public.swadhyay_post_replies to authenticated;
grant select, insert, delete on public.swadhyay_post_reactions to authenticated;
grant select, insert, delete on public.swadhyay_reply_reactions to authenticated;

-- ── 6. RPCs ─────────────────────────────────────────────────────────────────

-- Returns the single published topic whose [start_date, end_date] range
-- contains the given campaign date, or NULL.
create or replace function public.active_swadhyay_topic_for(p_day date)
returns public.swadhyay_topics
language sql
stable
security definer
set search_path = public
as $$
  select t.*
  from public.swadhyay_topics t
  where t.is_published
    and p_day between t.start_date and t.end_date
  order by t.start_date desc
  limit 1;
$$;

revoke all on function public.active_swadhyay_topic_for(date) from public;
grant execute on function public.active_swadhyay_topic_for(date) to authenticated;

-- Feed: user posts for a topic, newest first, with author info, reaction
-- counts, viewer-reacted flag, total reply count, and a single "preview"
-- reply (oldest) so the client can render an Instagram-style collapsed thread
-- without a second round-trip. Uses SECURITY DEFINER so author names from
-- public.profiles are visible even though profiles RLS restricts visibility.
create or replace function public.swadhyay_posts_for_topic(p_topic_id uuid)
returns table (
  id uuid,
  topic_id uuid,
  author_id uuid,
  body text,
  campaign_date date,
  is_revoked boolean,
  revoked_by uuid,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  author_display_name text,
  author_avatar_url text,
  reaction_count int,
  viewer_reacted boolean,
  reply_count int,
  preview_reply jsonb
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
    select sp.*
    from public.swadhyay_posts sp
    inner join public.swadhyay_topics t on t.id = sp.topic_id
    where sp.topic_id = p_topic_id
      and (t.is_published = true or public.is_organizer_session())
  ),
  rx as (
    select r.post_id, count(*)::int as cnt
    from public.swadhyay_post_reactions r
    inner join base b on b.id = r.post_id
    group by r.post_id
  ),
  me as (
    select r.post_id
    from public.swadhyay_post_reactions r
    inner join base b on b.id = r.post_id
    where r.user_id = v_uid
  ),
  reply_stats as (
    select r.post_id, count(*)::int as cnt
    from public.swadhyay_post_replies r
    inner join base b on b.id = r.post_id
    where r.is_deleted = false
    group by r.post_id
  ),
  first_reply as (
    select distinct on (r.post_id)
      r.post_id,
      r.id,
      r.author_id,
      r.body,
      r.created_at,
      r.is_deleted
    from public.swadhyay_post_replies r
    inner join base b on b.id = r.post_id
    where r.is_deleted = false
    order by r.post_id, r.created_at asc
  ),
  first_reply_rx as (
    select rr.reply_id, count(*)::int as cnt
    from public.swadhyay_reply_reactions rr
    inner join first_reply f on f.id = rr.reply_id
    group by rr.reply_id
  ),
  first_reply_me as (
    select rr.reply_id
    from public.swadhyay_reply_reactions rr
    inner join first_reply f on f.id = rr.reply_id
    where rr.user_id = v_uid
  )
  select
    b.id,
    b.topic_id,
    b.author_id,
    b.body,
    b.campaign_date,
    b.is_revoked,
    b.revoked_by,
    b.revoked_at,
    b.revoke_reason,
    b.created_at,
    b.updated_at,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(ae.display_name), ''),
      'Member'
    ) as author_display_name,
    coalesce(nullif(trim(p.avatar_url), ''), '/logo.png') as author_avatar_url,
    coalesce(rx.cnt, 0) as reaction_count,
    (me.post_id is not null) as viewer_reacted,
    coalesce(reply_stats.cnt, 0) as reply_count,
    case
      when fr.id is null then null
      else jsonb_build_object(
        'id', fr.id,
        'post_id', fr.post_id,
        'author_id', fr.author_id,
        'parent_reply_id', null,
        'body', fr.body,
        'is_deleted', fr.is_deleted,
        'created_at', fr.created_at,
        'updated_at', fr.created_at,
        'author_display_name', coalesce(
          nullif(trim(fp.display_name), ''),
          nullif(trim(fae.display_name), ''),
          'Member'
        ),
        'author_avatar_url', coalesce(nullif(trim(fp.avatar_url), ''), '/logo.png'),
        'reaction_count', coalesce(frrx.cnt, 0),
        'viewer_reacted', (frme.reply_id is not null)
      )
    end as preview_reply
  from base b
  left join public.profiles p on p.id = b.author_id
  left join public.allowed_emails ae on ae.email = lower(p.email)
  left join rx on rx.post_id = b.id
  left join me on me.post_id = b.id
  left join reply_stats on reply_stats.post_id = b.id
  left join first_reply fr on fr.post_id = b.id
  left join public.profiles fp on fp.id = fr.author_id
  left join public.allowed_emails fae on fae.email = lower(fp.email)
  left join first_reply_rx frrx on frrx.reply_id = fr.id
  left join first_reply_me frme on frme.reply_id = fr.id
  order by b.created_at desc;
end;
$$;

revoke all on function public.swadhyay_posts_for_topic(uuid) from public;
grant execute on function public.swadhyay_posts_for_topic(uuid) to authenticated;

-- All replies for a post, ordered by time. Flat list — the client can rebuild
-- the 1-level threading from parent_reply_id.
create or replace function public.swadhyay_replies_for_post(p_post_id uuid)
returns table (
  id uuid,
  post_id uuid,
  author_id uuid,
  parent_reply_id uuid,
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
    select r.*
    from public.swadhyay_post_replies r
    inner join public.swadhyay_posts sp on sp.id = r.post_id
    inner join public.swadhyay_topics t on t.id = sp.topic_id
    where r.post_id = p_post_id
      and (t.is_published = true or public.is_organizer_session())
  ),
  rx as (
    select rr.reply_id, count(*)::int as cnt
    from public.swadhyay_reply_reactions rr
    inner join base b on b.id = rr.reply_id
    group by rr.reply_id
  ),
  me as (
    select rr.reply_id
    from public.swadhyay_reply_reactions rr
    inner join base b on b.id = rr.reply_id
    where rr.user_id = v_uid
  )
  select
    b.id,
    b.post_id,
    b.author_id,
    b.parent_reply_id,
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
    (me.reply_id is not null) as viewer_reacted
  from base b
  left join public.profiles p on p.id = b.author_id
  left join public.allowed_emails ae on ae.email = lower(p.email)
  left join rx on rx.reply_id = b.id
  left join me on me.reply_id = b.id
  order by b.created_at asc;
end;
$$;

revoke all on function public.swadhyay_replies_for_post(uuid) from public;
grant execute on function public.swadhyay_replies_for_post(uuid) to authenticated;

-- ── 7. Standings update ─────────────────────────────────────────────────────
-- Adds Swadhyay points on top of the existing daily_notes formula:
--   pts_per_author = (daily_notes count * 2) + (distinct campaign_date with
--                     at least one non-revoked on-topic swadhyay post * 2).
-- Supersedes 20260416150000_standings_flat_two_per_note.sql.
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
      select dn.author_id, (count(*) * 2)::bigint as pts
      from public.daily_notes dn
      group by dn.author_id
    ),
    swadhyay_days as (
      -- one row per (author, campaign_date) where the user posted at least
      -- one non-revoked Swadhyay reflection that fell inside an active
      -- published topic window.
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

-- ── 8. Realtime publication ─────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'swadhyay_topics'
  ) then
    alter publication supabase_realtime add table public.swadhyay_topics;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'swadhyay_posts'
  ) then
    alter publication supabase_realtime add table public.swadhyay_posts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'swadhyay_post_replies'
  ) then
    alter publication supabase_realtime add table public.swadhyay_post_replies;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'swadhyay_post_reactions'
  ) then
    alter publication supabase_realtime add table public.swadhyay_post_reactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'swadhyay_reply_reactions'
  ) then
    alter publication supabase_realtime add table public.swadhyay_reply_reactions;
  end if;
end $$;
