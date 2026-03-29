import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-only Supabase client (Server Components, Server Actions, Route Handlers).
 * Reads/writes auth cookies via Next.js `cookies()` so the session persists across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware will refresh session on next navigation.
          }
        },
      },
    },
  );
}
