import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * One cookie config for browser client, middleware, route handlers, and RSC.
 * Mismatched options between runtimes are a common cause of “logged out after deploy”.
 */
export function getSupabaseCookieOptions(): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 400,
  };
}
