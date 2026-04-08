-- Swadhyay Phase 2
-- Adds threaded replies, per-comment reactions, and organizer pinning.

alter table public.swadhyay_topics
  add column if not exists pinned_comment_id uuid;

alter table public.swadhyay_comments
  add column if not exists parent_comment_id uuid references public.swadhyay_comments(id) on delete cascade;

create index if not exists swadhyay_comments_parent_idx
  on public.swadhyay_comments (parent_comment_id, created_at asc);

create table if not exists public.swadhyay_comment_reactions (
  comment_id uuid not null references public.swadhyay_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.swadhyay_comment_reactions enable row level security;

drop policy if exists "swadhyay_reactions_select_allowlisted" on public.swadhyay_comment_reactions;
create policy "swadhyay_reactions_select_allowlisted"
  on public.swadhyay_comment_reactions
  for select
  to authenticated
  using (
    public.is_allowlisted_session()
    and exists (
      select 1
      from public.swadhyay_comments c
      inner join public.swadhyay_topics t on t.id = c.topic_id
      where c.id = comment_id
        and (t.is_published = true or public.is_organizer_session())
    )
  );

drop policy if exists "swadhyay_reactions_insert_allowlisted" on public.swadhyay_comment_reactions;
create policy "swadhyay_reactions_insert_allowlisted"
  on public.swadhyay_comment_reactions
  for insert
  to authenticated
  with check (
    public.is_allowlisted_session()
    and user_id = auth.uid()
    and exists (
      select 1
      from public.swadhyay_comments c
      inner join public.swadhyay_topics t on t.id = c.topic_id
      where c.id = comment_id
        and t.is_published = true
    )
  );

drop policy if exists "swadhyay_reactions_delete_own" on public.swadhyay_comment_reactions;
create policy "swadhyay_reactions_delete_own"
  on public.swadhyay_comment_reactions
  for delete
  to authenticated
  using (
    public.is_allowlisted_session()
    and user_id = auth.uid()
  );

revoke all on public.swadhyay_comment_reactions from public;
grant select, insert, delete on public.swadhyay_comment_reactions to authenticated;
