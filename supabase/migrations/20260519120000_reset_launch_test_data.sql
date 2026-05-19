-- One-time launch reset: remove test ghunos, standings source data, Swadhyay posts/replies,
-- and Smruti feed posts. Safe to re-run (deletes 0 rows when already empty).
--
-- PRESERVED: auth.users, profiles, allowed_emails, avatar storage.
-- Do NOT delete from storage.objects in SQL (Supabase blocks it; use Storage API or npm script).
--
-- Run before launch via Supabase SQL Editor or supabase/scripts/verify-and-reset-test-data.sql

begin;

delete from public.approved_daily_notes;
delete from public.daily_notes;

delete from public.swadhyay_reply_reactions;
delete from public.swadhyay_post_reactions;
delete from public.swadhyay_post_replies;
delete from public.swadhyay_posts;
delete from public.swadhyay_topics;

delete from public.smruti_posts;

commit;
