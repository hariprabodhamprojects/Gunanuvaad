-- One-time data repair: subtract one calendar day from every `campaign_date`.
-- Intended when historical rows were stored one day ahead of the real campaign day.
-- Invoke once via service_role (see supabase/README.md). Calling twice shifts again.

create or replace function public.repair_daily_notes_campaign_minus_one_day()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  -- `WHERE true` satisfies Supabase “UPDATE requires a WHERE clause” guardrails.
  update public.daily_notes
  set campaign_date = campaign_date - interval '1 day'
  where true;
  get diagnostics n = row_count;
  return n;
end;
$$;

comment on function public.repair_daily_notes_campaign_minus_one_day() is
  'One-time repair: campaign_date := campaign_date - 1 day. service_role only. Run once.';

revoke all on function public.repair_daily_notes_campaign_minus_one_day() from public;
grant execute on function public.repair_daily_notes_campaign_minus_one_day() to service_role;
