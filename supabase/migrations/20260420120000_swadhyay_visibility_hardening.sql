-- Swadhyay visibility hardening — closes three related holes in one migration:
--
--   (A) Revoked-post body leak
--       `swadhyay_posts_for_topic` returned the full `body` text for revoked
--       posts. The client labels them "Revoked" but the raw body still arrived
--       over the wire and was rendered in the DOM. Anyone using devtools (or a
--       third-party client) could read a revoked post.
--
--   (B) Reply soft-delete leak
--       `swadhyay_post_replies.is_deleted` exists in the schema but the RPC
--       emits `body` unconditionally. Any future soft-delete code path (we
--       plan to replace the current hard-delete in a follow-up phase) would
--       ship the "deleted" text straight to every reader. Fix it now so the
--       product is safe for that swap by default.
--
--   (C) Replies-on-revoked
--       Members can currently post fresh replies under a revoked post. The
--       post is hidden from the UI but the thread keeps growing in the DB and
--       in real-time. Worse: a malicious client could keep dumping text into
--       a thread an organizer already nuked. Block at both layers (trigger +
--       server action) — defense in depth.
--
-- Principles that carry across to later phases:
--   • Organizers keep full read access. All three fixes are keyed off
--     `public.is_organizer_session()`, so moderator dashboards and audit
--     exports still see the raw content.
--   • Body is nulled to EMPTY STRING, not NULL, so the existing TypeScript
--     type `body: string` stays honest. The client decides what placeholder
--     to show based on `is_revoked` / `is_deleted` flags (which we *do* still
--     expose — they're meta, not content).
--   • Replies under a revoked post are filtered out entirely for regular
--     viewers — the post's thread is gone as a whole, not half-gone with
--     orphaned comments.

begin;

-- ── A) Posts RPC: hide body + preview_reply for revoked posts ─────────────
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
  v_is_org boolean := public.is_organizer_session();
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
      and (t.is_published = true or v_is_org)
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
    -- Reply counts: for revoked posts (non-organizer view) we want zero so
    -- the UI doesn't advertise "N comments" on something whose body is
    -- hidden. Organizers still see the true count for moderation context.
    select r.post_id, count(*)::int as cnt
    from public.swadhyay_post_replies r
    inner join base b on b.id = r.post_id
    where r.is_deleted = false
      and (b.is_revoked = false or v_is_org)
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
      and (b.is_revoked = false or v_is_org)
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
    -- (A) body redaction: empty string (not null) for revoked posts when
    --     the viewer isn't an organizer. Empty string keeps the `text`
    --     column NOT NULL-friendly for the TS type.
    case when b.is_revoked and not v_is_org then '' else b.body end as body,
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
        -- Preview reply body: same redaction rules as inline replies apply
        -- (see section B below).
        'body', case when fr.is_deleted and not v_is_org then '' else fr.body end,
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

-- ── B) Replies RPC: hide body on soft-deleted rows; hide all replies under
--       revoked posts for non-organizers ──────────────────────────────────
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
  v_is_org boolean := public.is_organizer_session();
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
      and (t.is_published = true or v_is_org)
      -- Replies under a revoked post vanish entirely for regular viewers.
      -- Organizers keep seeing them so they can audit the full thread.
      and (sp.is_revoked = false or v_is_org)
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
    -- (B) soft-delete redaction. Organizers still see the original text so
    --     they can make moderation decisions.
    case when b.is_deleted and not v_is_org then '' else b.body end as body,
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

-- ── C) Block INSERT/UPDATE into swadhyay_post_replies when target post is
--       revoked. BEFORE trigger so we never create the bad row. The error
--       code P0001 is what the server action checks for to produce a nice
--       UI message; any future SQL path bumping through this trigger gets
--       the same guardrail. ─────────────────────────────────────────────
create or replace function public._swadhyay_replies_block_on_revoked_post()
returns trigger
language plpgsql
as $$
declare
  v_revoked boolean;
begin
  select p.is_revoked into v_revoked
  from public.swadhyay_posts p
  where p.id = new.post_id;

  if v_revoked is true then
    raise exception 'post is revoked — replies disabled'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists swadhyay_replies_block_on_revoked_post_trg
  on public.swadhyay_post_replies;

create trigger swadhyay_replies_block_on_revoked_post_trg
  before insert or update of post_id, parent_reply_id, body
  on public.swadhyay_post_replies
  for each row execute function public._swadhyay_replies_block_on_revoked_post();

commit;
