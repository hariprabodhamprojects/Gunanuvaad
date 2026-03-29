/**
 * Base URL for Supabase OAuth `redirectTo` (must match an entry in Supabase → Auth → Redirect URLs).
 *
 * On **Vercel**, set `NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app` (no trailing slash) so
 * Google returns to your deployment, not localhost.
 *
 * Locally, leave it unset so `window.location.origin` is used.
 */
export function getOAuthRedirectOrigin(): string {
  if (typeof window === "undefined") return "";
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return window.location.origin;
}
