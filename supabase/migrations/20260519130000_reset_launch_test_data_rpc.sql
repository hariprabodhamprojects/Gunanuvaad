-- Service-role RPC to wipe test community data (ghunos, Swadhyay, Smruti DB rows).
-- Used by: npm run db:reset-test-data
-- Manual SQL: supabase/scripts/verify-and-reset-test-data.sql

create or replace function public.reset_launch_test_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  select jsonb_build_object(
    'daily_notes', (select count(*)::int from public.daily_notes),
    'approved_daily_notes', (select count(*)::int from public.approved_daily_notes),
    'swadhyay_posts', (select count(*)::int from public.swadhyay_posts),
    'swadhyay_post_replies', (select count(*)::int from public.swadhyay_post_replies),
    'swadhyay_topics', (select count(*)::int from public.swadhyay_topics),
    'smruti_posts', (select count(*)::int from public.smruti_posts)
  ) into v_before;

  delete from public.approved_daily_notes;
  delete from public.daily_notes;

  delete from public.swadhyay_reply_reactions;
  delete from public.swadhyay_post_reactions;
  delete from public.swadhyay_post_replies;
  delete from public.swadhyay_posts;
  delete from public.swadhyay_topics;

  delete from public.smruti_posts;

  select jsonb_build_object(
    'daily_notes', (select count(*)::int from public.daily_notes),
    'approved_daily_notes', (select count(*)::int from public.approved_daily_notes),
    'swadhyay_posts', (select count(*)::int from public.swadhyay_posts),
    'swadhyay_post_replies', (select count(*)::int from public.swadhyay_post_replies),
    'swadhyay_topics', (select count(*)::int from public.swadhyay_topics),
    'smruti_posts', (select count(*)::int from public.smruti_posts)
  ) into v_after;

  return jsonb_build_object('before', v_before, 'after', v_after);
end;
$$;

comment on function public.reset_launch_test_data() is
  'One-time wipe of test ghunos, Swadhyay, and Smruti rows. service_role only.';

revoke all on function public.reset_launch_test_data() from public;
grant execute on function public.reset_launch_test_data() to service_role;
