-- One-time launch reset: remove test ghunos, standings source data, Swadhyay posts/replies,
-- and Smruti feed posts. Safe to re-run (deletes 0 rows when already empty).
--
-- PRESERVED: auth.users, profiles, allowed_emails, avatar storage.
--
-- Run before launch via Supabase SQL Editor (as postgres) or `supabase db push`.
-- See supabase/README.md § Launch reset.

begin;

-- Ghunos + approved notes (standings / home slideshow source)
delete from public.approved_daily_notes;
delete from public.daily_notes;

-- Swadhyay reflections, replies, reactions, topics
delete from public.swadhyay_reply_reactions;
delete from public.swadhyay_post_reactions;
delete from public.swadhyay_post_replies;
delete from public.swadhyay_posts;
delete from public.swadhyay_topics;

-- Smruti feed (storage files + posts; likes/media cascade from posts)
delete from storage.objects where bucket_id = 'smruti';
delete from public.smruti_posts;

commit;
