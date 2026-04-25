-- Align `daily_notes` table CHECK with `submit_daily_note` and `lib/campaign-spec.ts`
-- (NOTE_BODY_MIN_LEN = 30, NOTE_BODY_MAX_LEN = 4000). Phase 4 only required >= 1.

alter table public.daily_notes
  drop constraint if exists daily_notes_body_len;

alter table public.daily_notes
  add constraint daily_notes_body_len
  check (char_length(body) >= 30 and char_length(body) <= 4000);
