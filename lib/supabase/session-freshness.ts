import type { SupabaseClient } from "@supabase/supabase-js";

/** Skip Supabase Auth network on Next.js link prefetch (RSC payload). */
export function isNextRouterPrefetch(request: Request): boolean {
  return request.headers.get("Next-Router-Prefetch") === "1";
}

/** Refresh only when the access token expires within this window (seconds). */
export async function sessionNeedsRefresh(
  supabase: SupabaseClient,
  bufferSeconds = 120,
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return false;

  const exp = session.expires_at;
  if (!exp) return true;

  return exp - Math.floor(Date.now() / 1000) <= bufferSeconds;
}
