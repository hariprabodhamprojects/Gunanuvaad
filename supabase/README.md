# Supabase setup (Phases 1–2)

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is enough for dev).

2. **Run the SQL migrations** (in order)  
   Open **SQL Editor** → paste and **Run** each file:

   - `migrations/20250328120000_phase1_auth.sql`
   - `migrations/20250328140000_invite_rpc_avatars.sql` (invite check RPC + `avatars` storage bucket)
   - `migrations/20250328210000_allowlist_session_rpc.sql` (session allowlist RPC used by the app after login)
   - `migrations/20250329120000_phase3_roster_mosaic_rpc.sql` (read-only roster for mosaic — no emails exposed)
   - `migrations/20250329130000_roster_exclude_self.sql` (roster omits the signed-in user so they are not pickable)
   - `migrations/20250330120000_phase4_daily_notes.sql` (daily notes + `recipient_write_eligibility` / `submit_daily_note` RPCs)
   - `migrations/20250330140000_allowlist_display_name.sql` (`display_name` on invite list + sync into `profiles`)
   - `migrations/20250330150000_sync_display_name_from_allowlist_fallback.sql` (name from allowlist, or derived from email local part when blank)
   - `migrations/20250331120000_phase5_standings.sql` (`standings_leaderboards()` RPC — points + streak leaderboards)
   - `migrations/20250331130000_standings_points_formula.sql` (points = first note to each recipient 2 pts, repeats 1 pt — stored as `notes + distinct recipients`)
   - `migrations/20250331140000_standings_rank_ties.sql` (ties share the same rank — superseded by dense rank below)
   - `migrations/20250331150000_standings_dense_rank.sql` (ties share rank; next group is `DENSE_RANK` 2, 3, … not skipping)
   - `migrations/20250331160000_repair_daily_notes_campaign_minus_one_rpc.sql` (optional **one-time** RPC to shift stored `campaign_date` back one day — see § One-time repair below)
   - `migrations/20250331160100_repair_daily_notes_rpc_where_clause.sql` (same RPC with `WHERE true` for Supabase “UPDATE requires a WHERE clause”)
   - `migrations/20250331170000_is_organizer_session.sql` (Phase 6 — `is_organizer_session()` for `/admin`; set `is_organizer = true` on your row in `allowed_emails`)
   - `migrations/20250331180000_admin_featured_notes_allowlist_overview.sql` (creates `featured_daily_notes` + organizer RPCs — superseded in naming by the next migration)
   - `migrations/20250331190000_approved_notes_rename_slideshow.sql` (renames to `approved_daily_notes` / approve–disapprove RPCs + `approved_notes_slideshow_random` for the home carousel)
   - `migrations/20250331200000_campaign_timezone_toronto.sql` (campaign day = `America/Toronto` in `submit_daily_note` / `recipient_write_eligibility` — keep in sync with `lib/campaign-spec.ts` `CAMPAIGN_TIMEZONE`)
   - `migrations/20250331210000_recipient_lock_50_and_picker_filter.sql` (recipient lock `K = 50`; new `roster_for_picker()` hides currently locked recipients from the pick list)
   - `migrations/20250331220000_note_min_100.sql` (enforces minimum 100 characters in `submit_daily_note`)
   - `migrations/20250331230000_admin_ghunos_export.sql` (organizer RPC `admin_ghunos_for_recipient()` for per-person export/copy workflows)
   - `migrations/20250331231000_admin_ghunos_export_approved_only.sql` (changes `admin_ghunos_for_recipient()` to export approved ghunos only)
   - `migrations/20260408120000_remove_recipient_lock_and_show_full_picker.sql` (removes recipient lock; `roster_for_picker()` returns all eligible people except self)
   - `migrations/20260408124500_seed_invites_and_show_users_without_photos.sql` (seeds two invites with names; picker includes invited-not-joined rows, with `/logo.png` fallback and disabled write until signup)
   - `migrations/20260408134000_allow_writes_to_invited_not_joined.sql` (allows writing to invited users before signup by using `recipient_email`; updates eligibility/submit + picker payload)
   - `migrations/20260408150000_swadhyay_phase1.sql` (Swadhyay: one topic/day by organizer, unlimited public comments, edit/delete own comments within 15 minutes)
   - `migrations/20260408162000_swadhyay_phase2_replies_reactions_pin.sql` (Swadhyay phase 2: replies, reactions, organizer pin/unpin comment)
   - `migrations/20260408170000_swadhyay_comments_feed_rpc.sql` (Swadhyay comments feed RPC with correct commenter names/avatar fallback for all viewers)

3. **Seed `allowed_emails`** with real addresses (all **lower-case**). **display_name** is optional: if omitted, the app derives a label from the part before `@` (e.g. `john.doe@gmail.com` → `John Doe`). Users only upload a photo at onboarding.

   ```sql
   insert into public.allowed_emails (email, display_name, is_organizer) values
     ('your-email@example.com', 'Your Name', true)
   on conflict (email) do update set
     display_name = excluded.display_name,
     is_organizer = excluded.is_organizer;
   ```

   Set `is_organizer = true` for people who should access `/admin` later.

4. **Auth → Providers**

   - Enable **Google** and add your **Google OAuth client ID** and **client secret** (create credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client, type **Web**; add the Supabase redirect URL Google shows you).
   - Under **Auth → Providers → Google**, paste the same redirect URL if prompted.
   - You can disable **Email** (magic link) if you only want Google sign-in.

5. **Auth → URL configuration**

   - **Site URL**: use your **production** URL when the app is deployed (e.g. `https://your-app.vercel.app`). For local-only testing, `http://localhost:3000` is fine.
   - **Redirect URLs** must include every origin you use (add both):
     - `http://localhost:3000/auth/callback`
     - `https://your-app.vercel.app/auth/callback` (and `/auth/callback` on any custom domain)
   - In **Vercel → Project → Settings → Environment Variables**, set  
     `NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app`  
     (no trailing slash). This makes Supabase OAuth `redirectTo` use your deployment host so Google does not send users back to `localhost` after sign-in.
   - If you land on `/?code=...` after Google, the app forwards that to `/auth/callback`; still fix **Site URL** / **Redirect URLs** and `NEXT_PUBLIC_SITE_URL` so the flow is correct end-to-end.

6. **Project API keys**  
   **Settings → API** → copy **Project URL** and **anon public** key into `.env.local`:

   ```bash
   cp .env.example .env.local
   # edit NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

7. **Test**  
   `npm run dev` → `/` (splash, then **Continue with Google**) → **onboarding** → `/home`. Use the **bottom bar** for Home / Standings / Me, and the **menu** (☰) for dark mode, notifications, and sign out.

If the Google account’s email is **not** in `allowed_emails`, you’ll see **Not on the invite list** (`/not-invited`) and the session is cleared.

## Historical notes after changing campaign timezone (e.g. IST → Toronto)

Applying `20250331200000_campaign_timezone_toronto.sql` only changes **how new notes get `campaign_date`** (server uses Toronto from then on). **Existing rows are not updated.**

- Each old row still has the calendar date that was correct under **`Asia/Kolkata` at submit time**.
- That can look “off by one” on the calendar **next to your Canadian evening** if you used to write when IST had already rolled to the next date — the DB was consistent with India, not with Toronto wall time.

**What you can do**

1. **Leave as-is** — dots and detail always match what is stored; only interpretation vs “my local day” may differ for older notes.
2. **If almost every old note is systematically one calendar day too late** (you always saw the next day in the app vs what you meant), run a **one-time** global `- 1 day` update after backing up — see **One-time repair** below (same SQL / RPC; verify in a copy first).
3. **If only a few rows are wrong** — fix with a targeted `update … where id = '…'` (or by `author_id` / date range) instead of shifting all rows.

New notes after the Toronto migration align with **Toronto** campaign days.

## One-time repair: `campaign_date` one day ahead

If every `daily_notes.campaign_date` was stored **one calendar day too late** (a note meant for the 28th shows as the 29th), fix existing rows **once**.

**Option A — SQL Editor (simplest)**  
Project → **SQL** → run:

```sql
update public.daily_notes
set campaign_date = campaign_date - interval '1 day'
where true;
```

**Option B — `curl` via PostgREST** (after migration `20250331160000_repair_daily_notes_campaign_minus_one_rpc.sql` is applied)

Use the **service role** key (**Settings → API**). Do **not** expose this key in the browser or commit it to git.

```bash
export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_SECRET"

curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/repair_daily_notes_campaign_minus_one_day" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

The response body is the number of rows updated (e.g. `3`). **Run only once**; a second call shifts dates again.

**Reverse** (if you overshoot): add one day instead:

```sql
update public.daily_notes
set campaign_date = campaign_date + interval '1 day'
where true;
```
