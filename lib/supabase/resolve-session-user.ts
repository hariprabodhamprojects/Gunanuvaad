import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Network validation — only when cookie session is missing (rare after middleware refresh).
 */
export async function resolveSessionUser(supabase: SupabaseClient): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (!error && data.user) return data.user;
  if (error) console.error("[auth] getUser failed", error.message);

  const sessionUser = (await supabase.auth.getSession()).data.session?.user ?? null;
  if (sessionUser) {
    console.warn("[auth] getUser unavailable — continuing with cookie session");
  }
  return sessionUser;
}
