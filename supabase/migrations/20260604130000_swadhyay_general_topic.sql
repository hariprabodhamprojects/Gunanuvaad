-- Make Swadhyay generic: a permanent "General" topic that always covers today,
-- so members can always share a reflection even when no weekly topic is set.
--
-- The weekly-topic admin flow is left fully intact. On any day an organizer's
-- published dated topic covers, `active_swadhyay_topic_for` still prefers it
-- (higher start_date wins the ORDER BY); otherwise the General topic is active.
--
-- The General topic spans all dates, so it is excluded from the no-overlap
-- exclusion constraint — organizers can still publish dated topics freely.

-- Fixed id so the app can recognise the General topic.
-- 00000000-0000-0000-0000-000000000001

-- 1. Let the General topic coexist with dated published topics.
alter table public.swadhyay_topics
  drop constraint if exists swadhyay_topics_no_overlap;

alter table public.swadhyay_topics
  add constraint swadhyay_topics_no_overlap exclude using gist (
    daterange(start_date, end_date, '[]') with &&
  ) where (is_published and id <> '00000000-0000-0000-0000-000000000001');

-- 2. Seed (or repair) the General topic. Needs an owner in auth.users.
do $$
declare
  v_owner uuid;
begin
  select p.id into v_owner
  from public.profiles p
  inner join public.allowed_emails ae on ae.email = lower(trim(p.email))
  where ae.is_organizer = true
  order by ae.created_at asc
  limit 1;

  if v_owner is null then
    select id into v_owner from auth.users order by created_at asc limit 1;
  end if;

  if v_owner is null then
    raise notice 'No users found — General Swadhyay topic will be seeded on next run.';
    return;
  end if;

  insert into public.swadhyay_topics (
    id, title, description, start_date, end_date, is_published, posted_by
  )
  values (
    '00000000-0000-0000-0000-000000000001',
    'Swadhyay',
    '',
    date '1970-01-01',
    date '9999-12-31',
    true,
    v_owner
  )
  on conflict (id) do update
    set title = excluded.title,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        is_published = true,
        updated_at = now();
end $$;
