-- Admin approval list: return full note body (was limited to 200 chars in body_preview).

create or replace function public.admin_notes_for_approval(p_limit int default 100)
returns table (
  note_id uuid,
  campaign_date date,
  body_preview text,
  author_display_name text,
  recipient_display_name text,
  is_approved boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := least(greatest(coalesce(p_limit, 100), 1), 200);
begin
  if not public.is_organizer_session() then
    return;
  end if;

  return query
  select
    dn.id as note_id,
    dn.campaign_date,
    dn.body as body_preview,
    coalesce(nullif(trim(pa.display_name), ''), pa.email, '—') as author_display_name,
    coalesce(nullif(trim(pr.display_name), ''), pr.email, '—') as recipient_display_name,
    (adn.id is not null) as is_approved,
    dn.created_at
  from public.daily_notes dn
  left join public.profiles pa on pa.id = dn.author_id
  left join public.profiles pr on pr.id = dn.recipient_id
  left join public.approved_daily_notes adn on adn.daily_note_id = dn.id
  order by dn.created_at desc
  limit lim;
end;
$$;
