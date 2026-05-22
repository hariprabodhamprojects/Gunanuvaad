-- Optional one-time check in Supabase SQL Editor (Dashboard → SQL).
-- Day-to-day linking is automatic via migration trigger `profiles_link_daily_notes`.
-- Deploy migrations instead of relying on this script.

-- 1) Link notes written before signup (same as migration backfill)
update public.daily_notes dn
set recipient_id = p.id
from public.profiles p
where dn.recipient_id is null
  and nullif(trim(dn.recipient_email), '') is not null
  and lower(trim(dn.recipient_email)) = lower(trim(p.email));

-- 2) Inspect Milan / any spotlight ghun still missing a photo
select
  dn.id,
  dn.recipient_id,
  dn.recipient_email,
  pr.display_name as profile_name,
  pr.email as profile_email,
  nullif(trim(pr.avatar_url), '') is not null as has_avatar,
  adn.daily_note_id is not null as is_approved
from public.daily_notes dn
left join public.profiles pr on pr.id = dn.recipient_id
left join public.profiles pr_e
  on nullif(trim(dn.recipient_email), '') is not null
  and lower(trim(pr_e.email)) = lower(trim(dn.recipient_email))
left join public.approved_daily_notes adn on adn.daily_note_id = dn.id
where coalesce(pr.display_name, pr_e.display_name, '') ilike '%milan%'
   or coalesce(dn.recipient_email, pr.email, pr_e.email, '') ilike '%milan%'
order by dn.created_at desc
limit 20;
