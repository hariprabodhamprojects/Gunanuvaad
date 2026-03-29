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

3. **Seed `allowed_emails`** with real addresses (all **lower-case**) and **display names** (shown in the app; users only upload a photo at onboarding):

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

   - **Site URL**: `http://localhost:3000` (production: your real domain).
   - **Redirect URLs** add:
     - `http://localhost:3000/auth/callback`
     - Your production callback, e.g. `https://your-domain.com/auth/callback` (wildcard optional).

6. **Project API keys**  
   **Settings → API** → copy **Project URL** and **anon public** key into `.env.local`:

   ```bash
   cp .env.example .env.local
   # edit NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

7. **Test**  
   `npm run dev` → `/login` → invite flow → **onboarding** → `/home`. Use the **bottom bar** for Home / Standings / Me, and the **menu** (☰) for dark mode, notifications, and sign out.

If the Google account’s email is **not** in `allowed_emails`, you’ll see **Not on the invite list** (`/not-invited`) and the session is cleared.
