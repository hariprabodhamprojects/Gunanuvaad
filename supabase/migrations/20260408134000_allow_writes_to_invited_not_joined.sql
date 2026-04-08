-- Allow writing daily ghun to invited users before they sign up.
-- Approach: daily_notes stores recipient_email always; recipient_id is nullable.

alter table public.daily_notes
  add column if not exists recipient_email text;

update public.daily_notes dn
set recipient_email = lower(p.email)
from public.profiles p
where dn.recipient_email is null
  and dn.recipient_id = p.id;

alter table public.daily_notes
  alter column recipient_id drop not null;

alter table public.daily_notes
  drop constraint if exists daily_notes_recipient_target_required;

alter table public.daily_notes
  add constraint daily_notes_recipient_target_required
  check (recipient_id is not null or nullif(trim(recipient_email), '') is not null);

create index if not exists daily_notes_author_recipient_email_created
  on public.daily_notes (author_id, recipient_email, created_at desc);

drop function if exists public.recipient_write_eligibility(uuid);
create function public.recipient_write_eligibility(
  p_recipient_id uuid default null,
  p_recipient_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_campaign_date date;
  v_target_id uuid;
  v_target_email text;
  v_my_email text;
begin
  if v_uid is null or not public.is_allowlisted_session() then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  select lower(p.email) into v_my_email
  from public.profiles p
  where p.id = v_uid;

  if p_recipient_id is not null then
    select p.id, lower(p.email)
      into v_target_id, v_target_email
    from public.profiles p
    inner join public.allowed_emails ae on ae.email = lower(p.email)
    where p.id = p_recipient_id
    limit 1;
  elsif nullif(trim(coalesce(p_recipient_email, '')), '') is not null then
    select p.id, ae.email
      into v_target_id, v_target_email
    from public.allowed_emails ae
    left join public.profiles p on lower(p.email) = ae.email
    where ae.email = lower(trim(p_recipient_email))
    limit 1;
  end if;

  if v_target_email is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_recipient');
  end if;

  if (v_target_id is not null and v_target_id = v_uid)
     or (v_my_email is not null and v_target_email = v_my_email) then
    return jsonb_build_object('ok', false, 'code', 'self');
  end if;

  v_campaign_date := (timezone('America/Toronto', now()))::date;

  if exists (
    select 1
    from public.daily_notes
    where author_id = v_uid
      and campaign_date = v_campaign_date
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_today');
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', 'eligible',
    'recipient_id', v_target_id,
    'recipient_email', v_target_email
  );
end;
$$;

revoke all on function public.recipient_write_eligibility(uuid, text) from public;
grant execute on function public.recipient_write_eligibility(uuid, text) to authenticated;

drop function if exists public.submit_daily_note(uuid, text);
create function public.submit_daily_note(
  p_recipient_id uuid default null,
  p_recipient_email text default null,
  p_body text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_elig jsonb;
  v_body text := trim(p_body);
  v_campaign_date date;
  v_id uuid;
  v_target_id uuid;
  v_target_email text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  v_elig := public.recipient_write_eligibility(p_recipient_id, p_recipient_email);
  if not coalesce((v_elig->>'ok')::boolean, false) then
    return v_elig;
  end if;

  if char_length(v_body) < 100 or char_length(v_body) > 4000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_body');
  end if;

  v_target_id := nullif(v_elig->>'recipient_id', '')::uuid;
  v_target_email := lower(coalesce(v_elig->>'recipient_email', ''));

  v_campaign_date := (timezone('America/Toronto', now()))::date;

  insert into public.daily_notes (author_id, recipient_id, recipient_email, body, campaign_date)
  values (v_uid, v_target_id, v_target_email, v_body, v_campaign_date)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'already_today');
end;
$$;

revoke all on function public.submit_daily_note(uuid, text, text) from public;
grant execute on function public.submit_daily_note(uuid, text, text) to authenticated;

drop function if exists public.roster_for_picker();
create function public.roster_for_picker()
returns table (
  row_id text,
  recipient_id uuid,
  recipient_email text,
  display_name text,
  avatar_url text,
  has_signed_up boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null or not public.is_allowlisted_session() then
    return;
  end if;

  select lower(p.email) into v_email
  from public.profiles p
  where p.id = v_uid;

  return query
  select
    coalesce(p.id::text, 'invite:' || ae.email) as row_id,
    p.id as recipient_id,
    ae.email as recipient_email,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(ae.display_name), '')
    ) as display_name,
    coalesce(nullif(trim(p.avatar_url), ''), '/logo.png') as avatar_url,
    (p.id is not null) as has_signed_up
  from public.allowed_emails ae
  left join public.profiles p on lower(p.email) = ae.email
  where ae.email <> coalesce(v_email, '')
    and coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(ae.display_name), ''),
      ''
    ) <> ''
  order by
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(ae.display_name), ''),
      ae.email
    ) asc;
end;
$$;

revoke all on function public.roster_for_picker() from public;
grant execute on function public.roster_for_picker() to authenticated;
