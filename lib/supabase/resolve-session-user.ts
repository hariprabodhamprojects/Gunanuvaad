import type { SupabaseClient, User } from "@supabase/supabase-js";

const RETRY_DELAY_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prefer validated `getUser()`. On cold starts / deploy spikes, Auth can be slow;
 * retry once and only then fall back to cookie `getSession()` so users are not
 * sent back to Google sign-in while refresh tokens are still valid.
 */
export async function resolveSessionUser(supabase: SupabaseClient): Promise<User | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return data.user;
    if (error) {
      console.error("[auth] getUser failed", error.message, { attempt });
    }
    if (attempt === 0) await sleep(RETRY_DELAY_MS);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user ?? null;
  if (sessionUser) {
    console.warn("[auth] getUser unavailable — continuing with cookie session");
  }
  return sessionUser;
}
