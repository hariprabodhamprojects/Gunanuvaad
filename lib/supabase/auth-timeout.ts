import type { SupabaseClient, User } from "@supabase/supabase-js";

const DEFAULT_AUTH_MS = 5_000;

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("supabase_auth_timeout")), ms);
  });
}

/** Server/client-safe: never block the UI indefinitely on Supabase Auth. */
export async function getUserWithTimeout(
  supabase: SupabaseClient,
  ms = DEFAULT_AUTH_MS,
): Promise<{ user: User | null; timedOut: boolean }> {
  try {
    const { data, error } = await Promise.race([
      supabase.auth.getUser(),
      timeoutPromise(ms),
    ]);
    if (error) {
      console.error("[auth] getUser", error.message);
      return { user: null, timedOut: false };
    }
    return { user: data.user ?? null, timedOut: false };
  } catch (e) {
    const timedOut = e instanceof Error && e.message === "supabase_auth_timeout";
    if (timedOut) console.error("[auth] getUser timed out");
    return { user: null, timedOut };
  }
}

export async function rpcBooleanWithTimeout(
  supabase: SupabaseClient,
  fn: string,
  ms = DEFAULT_AUTH_MS,
): Promise<{ value: boolean; timedOut: boolean; error: Error | null }> {
  try {
    const { data, error } = await Promise.race([
      supabase.rpc(fn),
      timeoutPromise(ms),
    ]);
    if (error) return { value: false, timedOut: false, error };
    return { value: Boolean(data), timedOut: false, error: null };
  } catch (e) {
    const timedOut = e instanceof Error && e.message === "supabase_auth_timeout";
    return { value: false, timedOut, error: timedOut ? null : (e as Error) };
  }
}
