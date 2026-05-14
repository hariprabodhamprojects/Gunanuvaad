-- Smruti: Instagram-style photo feed (1–5 images, required caption, likes only, no unlike).

-- ── Tables ──────────────────────────────────────────────────────────────────

create table public.smruti_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  caption text not null,
  created_at timestamptz not null default now(),
  constraint smruti_posts_caption_trim check (char_length(trim(caption)) >= 1)
);

create index smruti_posts_created_idx
  on public.smruti_posts (created_at desc);

create table public.smruti_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.smruti_posts (id) on delete cascade,
  sort_order int not null,
  storage_path text not null,
  constraint smruti_post_media_sort_range check (sort_order between 0 and 4),
  constraint smruti_post_media_path_nonempty check (char_length(trim(storage_path)) >= 1),
  constraint smruti_post_media_unique_order unique (post_id, sort_order)
);

create index smruti_post_media_post_idx
  on public.smruti_post_media (post_id);

create table public.smruti_likes (
  post_id uuid not null references public.smruti_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index smruti_likes_post_idx
  on public.smruti_likes (post_id);

-- ── Row level security ─────────────────────────────────────────────────────

alter table public.smruti_posts enable row level security;
alter table public.smruti_post_media enable row level security;
alter table public.smruti_likes enable row level security;

create policy "smruti_posts_select_allowlisted"
  on public.smruti_posts
  for select
  to authenticated
  using (public.is_allowlisted_session());

create policy "smruti_posts_insert_allowlisted"
  on public.smruti_posts
  for insert
  to authenticated
  with check (
    public.is_allowlisted_session()
    and author_id = auth.uid()
  );

create policy "smruti_posts_delete_own_or_organizer"
  on public.smruti_posts
  for delete
  to authenticated
  using (
    public.is_allowlisted_session()
    and (
      public.is_organizer_session()
      or author_id = auth.uid()
    )
  );

create policy "smruti_post_media_select_allowlisted"
  on public.smruti_post_media
  for select
  to authenticated
  using (public.is_allowlisted_session());

create policy "smruti_post_media_insert_author"
  on public.smruti_post_media
  for insert
  to authenticated
  with check (
    public.is_allowlisted_session()
    and exists (
      select 1
      from public.smruti_posts p
      where p.id = post_id
        and p.author_id = auth.uid()
    )
  );

create policy "smruti_post_media_delete_own_or_organizer"
  on public.smruti_post_media
  for delete
  to authenticated
  using (
    public.is_allowlisted_session()
    and exists (
      select 1
      from public.smruti_posts p
      where p.id = post_id
        and (
          p.author_id = auth.uid()
          or public.is_organizer_session()
        )
    )
  );

create policy "smruti_likes_select_allowlisted"
  on public.smruti_likes
  for select
  to authenticated
  using (public.is_allowlisted_session());

create policy "smruti_likes_insert_allowlisted"
  on public.smruti_likes
  for insert
  to authenticated
  with check (
    public.is_allowlisted_session()
    and user_id = auth.uid()
    and exists (
      select 1
      from public.smruti_posts p
      where p.id = post_id
    )
  );

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on public.smruti_posts from public;
revoke all on public.smruti_post_media from public;
revoke all on public.smruti_likes from public;

grant select, insert, delete on public.smruti_posts to authenticated;
grant select, insert, delete on public.smruti_post_media to authenticated;
grant select, insert on public.smruti_likes to authenticated;

-- ── Feed RPC (single round-trip; joins profiles + media + like meta) ───────

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
        'liked_by_me', (lk.user_id is not null)
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
  ) q;
$$;

comment on function public.smruti_feed_page(int, timestamptz) is
  'Allowlisted feed page for Smruti: posts with media, like counts, and liked_by_me for auth.uid().';

revoke all on function public.smruti_feed_page(int, timestamptz) from public;
grant execute on function public.smruti_feed_page(int, timestamptz) to authenticated;

-- ── Storage: public bucket `smruti`, paths `{post_id}/{sort}.{ext}` ─────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'smruti',
  'smruti',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "smruti_select_public" on storage.objects;
drop policy if exists "smruti_insert_post_author" on storage.objects;
drop policy if exists "smruti_update_post_author" on storage.objects;
drop policy if exists "smruti_delete_post_author_or_organizer" on storage.objects;

create policy "smruti_select_public"
  on storage.objects
  for select
  using (bucket_id = 'smruti');

create policy "smruti_insert_post_author"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'smruti'
    and public.is_allowlisted_session()
    and exists (
      select 1
      from public.smruti_posts p
      where p.id::text = split_part(name, '/', 1)
        and p.author_id = auth.uid()
    )
  );

create policy "smruti_update_post_author"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'smruti'
    and public.is_allowlisted_session()
    and exists (
      select 1
      from public.smruti_posts p
      where p.id::text = split_part(name, '/', 1)
        and p.author_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'smruti'
    and public.is_allowlisted_session()
    and exists (
      select 1
      from public.smruti_posts p
      where p.id::text = split_part(name, '/', 1)
        and p.author_id = auth.uid()
    )
  );

create policy "smruti_delete_post_author_or_organizer"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'smruti'
    and public.is_allowlisted_session()
    and exists (
      select 1
      from public.smruti_posts p
      where p.id::text = split_part(name, '/', 1)
        and (
          p.author_id = auth.uid()
          or public.is_organizer_session()
        )
    )
  );
