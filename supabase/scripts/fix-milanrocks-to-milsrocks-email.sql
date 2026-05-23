-- Fix typo: milanrocks07@gmail.com → milsrocks07@gmail.com (allowlist + Milan's profile).
-- Run in Supabase → SQL Editor. Preview (step 1), then run step 2.

-- ── 1) Preview ───────────────────────────────────────────────────────────────
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
where lower(trim(dn.recipient_email)) = lower(trim('milanrocks07@gmail.com'))
order by dn.created_at desc;

select email, display_name
from public.allowed_emails
where email in (
  lower(trim('milanrocks07@gmail.com')),
  lower(trim('milsrocks07@gmail.com'))
);

select id, email, display_name, nullif(trim(avatar_url), '') is not null as has_avatar
from public.profiles
where lower(trim(email)) = lower(trim('milsrocks07@gmail.com'));

-- ── 2) Fix email + link profile (run after preview) ───────────────────────────
update public.daily_notes dn
set
  recipient_email = lower(trim('milsrocks07@gmail.com')),
  recipient_id = (
    select p.id
    from public.profiles p
    where lower(trim(p.email)) = lower(trim('milsrocks07@gmail.com'))
    limit 1
  )
where lower(trim(dn.recipient_email)) = lower(trim('milanrocks07@gmail.com'));

-- ── 3) Verify ─────────────────────────────────────────────────────────────────
select
  dn.id,
  dn.recipient_email,
  dn.recipient_id,
  pr.display_name,
  pr.email as profile_email,
  nullif(trim(pr.avatar_url), '') is not null as has_avatar
from public.daily_notes dn
left join public.profiles pr on pr.id = dn.recipient_id
where lower(trim(dn.recipient_email)) = lower(trim('milsrocks07@gmail.com'))
   or dn.id = '34c677ea-5c49-40e5-ae25-c9144cb10519'::uuid;
