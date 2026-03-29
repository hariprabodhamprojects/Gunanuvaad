import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — use in Client Components (forms, sign-out, realtime later).
 * Singleton pattern is optional; creating per component is fine at your scale.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
