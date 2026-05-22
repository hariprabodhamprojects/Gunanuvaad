-- Ghuns written before signup store recipient_email only (recipient_id null).
-- After the recipient completes profile, link notes and resolve avatars from their profile.

-- One-time backfill for existing rows.
update public.daily_notes dn
set recipient_id = p.id
from public.profiles p
where dn.recipient_id is null
  and nullif(trim(dn.recipient_email), '') is not null
  and lower(trim(dn.recipient_email)) = lower(trim(p.email));

-- Keep recipient_id in sync when someone signs up or their profile email is set.
create or replace function public.link_daily_notes_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.daily_notes dn
  set recipient_id = new.id
  where dn.recipient_id is null
    and nullif(trim(dn.recipient_email), '') is not null
    and lower(trim(dn.recipient_email)) = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists profiles_link_daily_notes on public.profiles;
create trigger profiles_link_daily_notes
  after insert or update of email on public.profiles
  for each row
  execute function public.link_daily_notes_to_profile();

-- Realtime: profile photo / name updates should refresh home + calendar.
alter table public.profiles replica identity full;

-- Home approved carousel: resolve recipient profile by id OR invite email.
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
        nullif(trim(ae.display_name), ''),
        nullif(trim(pr.email), ''),
        nullif(trim(pr_e.email), ''),
        nullif(trim(dn.recipient_email), ''),
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
      on dn.recipient_id is null
      and lower(trim(pr_e.email)) = lower(trim(coalesce(dn.recipient_email, '')))
    left join public.allowed_emails ae
      on ae.email = lower(trim(coalesce(
        nullif(trim(dn.recipient_email), ''),
        pr.email,
        pr_e.email,
        ''
      )))
  ) x;

  return coalesce(result, '[]'::jsonb);
end;
$$;
