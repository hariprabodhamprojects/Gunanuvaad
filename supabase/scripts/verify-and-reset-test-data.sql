-- Run in Supabase SQL Editor on the SAME project as your app (.env NEXT_PUBLIC_SUPABASE_URL).
-- Do NOT delete from storage.objects here — Supabase blocks it and rolls back the whole transaction.
-- Smruti DB rows are cleared below; orphan files in the smruti bucket are harmless (empty feed).
-- Optional: npm run db:reset-test-data (uses Storage API to empty the bucket too).

-- ── BEFORE (counts) ─────────────────────────────────────────────────────────
select 'daily_notes' as table_name, count(*)::bigint as row_count from public.daily_notes
union all select 'approved_daily_notes', count(*) from public.approved_daily_notes
union all select 'swadhyay_posts', count(*) from public.swadhyay_posts
union all select 'swadhyay_post_replies', count(*) from public.swadhyay_post_replies
union all select 'swadhyay_topics', count(*) from public.swadhyay_topics
union all select 'smruti_posts', count(*) from public.smruti_posts
order by table_name;

-- ── RESET (destructive) ─────────────────────────────────────────────────────
begin;

delete from public.approved_daily_notes;
delete from public.daily_notes;

delete from public.swadhyay_reply_reactions;
delete from public.swadhyay_post_reactions;
delete from public.swadhyay_post_replies;
delete from public.swadhyay_posts;
delete from public.swadhyay_topics;

-- likes + media cascade when posts are deleted
delete from public.smruti_posts;

commit;

-- ── AFTER (must all be 0) ───────────────────────────────────────────────────
select 'daily_notes' as table_name, count(*)::bigint as row_count from public.daily_notes
union all select 'approved_daily_notes', count(*) from public.approved_daily_notes
union all select 'swadhyay_posts', count(*) from public.swadhyay_posts
union all select 'swadhyay_post_replies', count(*) from public.swadhyay_post_replies
union all select 'swadhyay_topics', count(*) from public.swadhyay_topics
union all select 'smruti_posts', count(*) from public.smruti_posts
order by table_name;
