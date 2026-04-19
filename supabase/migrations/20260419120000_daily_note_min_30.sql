-- Lower the minimum `daily_notes.body` length from 100 to 30 characters.
--
-- The TypeScript source of truth is `lib/campaign-spec.ts::NOTE_BODY_MIN_LEN`.
-- The RPC re-checks the length so the server enforces the limit even if the
-- client is bypassed; this migration keeps the two in sync.
--
-- Everything else about `submit_daily_note` is unchanged — we only adjust the
-- length guard. The function signature / grants match
-- 20260408134000_allow_writes_to_invited_not_joined.sql so dependent callers
-- keep working.

drop function if exists public.submit_daily_note(uuid, text, text);
create function public.submit_daily_note(
  p_recipient_id uuid default null,
  p_recipient_email text default null,
  p_body text default ''
)
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
  v_target_id uuid;
  v_target_email text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  v_elig := public.recipient_write_eligibility(p_recipient_id, p_recipient_email);
  if not coalesce((v_elig->>'ok')::boolean, false) then
    return v_elig;
  end if;

  -- Mirrors NOTE_BODY_MIN_LEN / NOTE_BODY_MAX_LEN in lib/campaign-spec.ts.
  if char_length(v_body) < 30 or char_length(v_body) > 4000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_body');
  end if;

  v_target_id := nullif(v_elig->>'recipient_id', '')::uuid;
  v_target_email := lower(coalesce(v_elig->>'recipient_email', ''));

  v_campaign_date := (timezone('America/Toronto', now()))::date;

  insert into public.daily_notes (author_id, recipient_id, recipient_email, body, campaign_date)
  values (v_uid, v_target_id, v_target_email, v_body, v_campaign_date)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'already_today');
end;
$$;

revoke all on function public.submit_daily_note(uuid, text, text) from public;
grant execute on function public.submit_daily_note(uuid, text, text) to authenticated;
