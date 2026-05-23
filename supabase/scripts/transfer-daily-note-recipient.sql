-- Transfer ghun(s) from one invite email to another (wrong picker / duplicate invite).
-- Run in Supabase → SQL Editor. Preview first, then uncomment the UPDATE.
--
-- Example: ghun written for milanrupapara89@gmail.com should belong to milsrocks07@gmail.com
-- (see fix-milanrocks-to-milsrocks-email.sql for milanrocks → milsrocks typo)

-- ── 1) Preview rows that will change ─────────────────────────────────────────
select
  dn.id,
  dn.campaign_date,
  dn.created_at,
  dn.recipient_id,
  dn.recipient_email,
  left(trim(dn.body), 120) as body_preview,
  adn.daily_note_id is not null as is_approved
from public.daily_notes dn
left join public.approved_daily_notes adn on adn.daily_note_id = dn.id
where lower(trim(dn.recipient_email)) = lower(trim('milanrupapara89@gmail.com'))
order by dn.created_at desc;

-- Confirm the target invite exists and has a display name
select email, display_name
from public.allowed_emails
where email in (
  lower(trim('milanrupapara89@gmail.com')),
  lower(trim('milsrocks07@gmail.com'))
);

-- Profile id for the correct user (null if they have not signed up yet)
select id, email, display_name, avatar_url
from public.profiles
where lower(trim(email)) = lower(trim('milsrocks07@gmail.com'));

-- ── 2) Transfer (uncomment after preview looks right) ─────────────────────────
/*
update public.daily_notes dn
set
  recipient_email = lower(trim('milsrocks07@gmail.com')),
  recipient_id = (
    select p.id
    from public.profiles p
    where lower(trim(p.email)) = lower(trim('milsrocks07@gmail.com'))
    limit 1
  )
where lower(trim(dn.recipient_email)) = lower(trim('milanrupapara89@gmail.com'));
*/

-- ── 3) Verify after update ────────────────────────────────────────────────────
/*
select
  dn.id,
  dn.recipient_email,
  pr.display_name,
  ae.display_name as allowlist_name
from public.daily_notes dn
left join public.profiles pr on pr.id = dn.recipient_id
left join public.allowed_emails ae on ae.email = lower(trim(dn.recipient_email))
where lower(trim(dn.recipient_email)) = lower(trim('milsrocks07@gmail.com'))
   or dn.id in (
     select id from public.daily_notes
     where lower(trim(recipient_email)) = lower(trim('milanrupapara89@gmail.com'))
   );
*/
