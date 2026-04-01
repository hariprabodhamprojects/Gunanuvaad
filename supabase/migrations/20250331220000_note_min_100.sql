-- Raise minimum body length for submissions to 100 characters.
-- Keeps all other submit_daily_note behavior unchanged.

create or replace function public.submit_daily_note(p_recipient_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_elig jsonb;
  v_body text := trim(p_body);
  v_campaign_date date;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  v_elig := public.recipient_write_eligibility(p_recipient_id);
  if not coalesce((v_elig->>'ok')::boolean, false) then
    return v_elig;
  end if;

  if char_length(v_body) < 100 or char_length(v_body) > 4000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_body');
  end if;

  v_campaign_date := (timezone('America/Toronto', now()))::date;

  insert into public.daily_notes (author_id, recipient_id, body, campaign_date)
  values (v_uid, p_recipient_id, v_body, v_campaign_date)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'already_today');
end;
$$;
