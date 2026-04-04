-- Admin export: per-recipient ghunos for test ctest opy/paste (Word, docs, etc.)

create or replace function public.admin_ghunos_for_recipient(
  p_recipient_query text,
  p_from date default null,
  p_to date default null,
  p_limit int default 1000
)
returns table (
  note_id uuid,
  campaign_date date,
  created_at timestamptz,
  author_display_name text,
  author_email text,
  recipient_display_name text,
  recipient_email text,
  body text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := btrim(coalesce(p_recipient_query, ''));
  lim int := least(greatest(coalesce(p_limit, 1000), 1), 2000);
begin
  if not public.is_organizer_session() then
    return;
  end if;

  if q = '' then
    return;
  end if;

  return query
  select
    dn.id as note_id,
    dn.campaign_date,
    dn.created_at,
    coalesce(nullif(trim(pa.display_name), ''), pa.email, '—') as author_display_name,
    coalesce(pa.email, '') as author_email,
    coalesce(nullif(trim(pr.display_name), ''), pr.email, '—') as recipient_display_name,
    coalesce(pr.email, '') as recipient_email,
    dn.body
  from public.daily_notes dn
  left join public.profiles pa on pa.id = dn.author_id
  left join public.profiles pr on pr.id = dn.recipient_id
  where (
      coalesce(pr.display_name, '') ilike ('%' || q || '%')
      or coalesce(pr.email, '') ilike ('%' || q || '%')
    )
    and (p_from is null or dn.campaign_date >= p_from)
    and (p_to is null or dn.campaign_date <= p_to)
  order by dn.campaign_date asc, dn.created_at asc
  limit lim;
end;
$$;

revoke all on function public.admin_ghunos_for_recipient(text, date, date, int) from public;
grant execute on function public.admin_ghunos_for_recipient(text, date, date, int) to authenticated;
