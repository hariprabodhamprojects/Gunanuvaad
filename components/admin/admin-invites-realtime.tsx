"use client";

import { useRealtimeRefresh } from "@/lib/supabase/use-realtime-refresh";

/**
 * Invisible client helper: refreshes the admin invites page server tree
 * whenever someone is added to the allowlist or a new user completes their
 * profile (both of which affect the "Invited / Signed up / Roster-ready"
 * counts and the table rows).
 */
export function AdminInvitesRealtime() {
  useRealtimeRefresh({
    channel: "admin-invites",
    subscriptions: [
      { table: "allowed_emails" },
      { table: "profiles" },
    ],
    // Debounce generously — signups and allowlist edits are infrequent and
    // we'd rather collapse a batch update than re-fetch many times.
    debounceMs: 500,
  });
  return null;
}
