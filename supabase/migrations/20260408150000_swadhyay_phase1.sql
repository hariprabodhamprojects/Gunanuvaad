-- Swadhyay Phase 1
-- One topic per campaign day, unlimited public comments, edit/delete own comments within 15 minutes.

create table if not exists public.swadhyay_topics (
  id uuid primary key default gen_random_uuid(),
  campaign_date date not null unique,
  title text not null,
  body text not null,
  scripture_ref text,
  is_published boolean not null default true,
  posted_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint swadhyay_topics_title_len check (char_length(trim(title)) between 1 and 200),
  constraint swadhyay_topics_body_len check (char_length(trim(body)) between 1 and 12000)
);

create table if not exists public.swadhyay_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.swadhyay_topics(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint swadhyay_comments_body_len check (char_length(trim(body)) between 1 and 2000)
);

create index if not exists swadhyay_topics_date_idx
  on public.swadhyay_topics (campaign_date desc);

create index if not exists swadhyay_comments_topic_created_idx
  on public.swadhyay_comments (topic_id, created_at asc);

alter table public.swadhyay_topics enable row level security;
alter table public.swadhyay_comments enable row level security;

drop policy if exists "swadhyay_topics_select_allowlisted" on public.swadhyay_topics;
create policy "swadhyay_topics_select_allowlisted"
  on public.swadhyay_topics
  for select
  to authenticated
  using (
    public.is_allowlisted_session()
    and (is_published = true or public.is_organizer_session())
  );

drop policy if exists "swadhyay_topics_insert_organizer" on public.swadhyay_topics;
create policy "swadhyay_topics_insert_organizer"
  on public.swadhyay_topics
  for insert
  to authenticated
  with check (public.is_organizer_session());

drop policy if exists "swadhyay_topics_update_organizer" on public.swadhyay_topics;
create policy "swadhyay_topics_update_organizer"
  on public.swadhyay_topics
  for update
  to authenticated
  using (public.is_organizer_session())
  with check (public.is_organizer_session());

drop policy if exists "swadhyay_comments_select_allowlisted" on public.swadhyay_comments;
create policy "swadhyay_comments_select_allowlisted"
  on public.swadhyay_comments
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

drop policy if exists "swadhyay_comments_insert_allowlisted" on public.swadhyay_comments;
create policy "swadhyay_comments_insert_allowlisted"
  on public.swadhyay_comments
  for insert
  to authenticated
  with check (
    public.is_allowlisted_session()
    and author_id = auth.uid()
    and exists (
      select 1
      from public.swadhyay_topics t
      where t.id = topic_id
        and t.is_published = true
    )
  );

drop policy if exists "swadhyay_comments_update_own_15m_or_organizer" on public.swadhyay_comments;
create policy "swadhyay_comments_update_own_15m_or_organizer"
  on public.swadhyay_comments
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

drop policy if exists "swadhyay_comments_delete_own_15m_or_organizer" on public.swadhyay_comments;
create policy "swadhyay_comments_delete_own_15m_or_organizer"
  on public.swadhyay_comments
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

revoke all on public.swadhyay_topics from public;
revoke all on public.swadhyay_comments from public;
grant select, insert, update on public.swadhyay_topics to authenticated;
grant select, insert, update, delete on public.swadhyay_comments to authenticated;
