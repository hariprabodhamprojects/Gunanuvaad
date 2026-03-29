-- Fix repair RPC for projects where bare UPDATE without WHERE is rejected.

create or replace function public.repair_daily_notes_campaign_minus_one_day()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  update public.daily_notes
  set campaign_date = campaign_date - interval '1 day'
  where true;
  get diagnostics n = row_count;
  return n;
end;
$$;
