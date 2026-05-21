import type { NextRequest } from "next/server";
import { handleOAuthCallback } from "@/lib/auth/oauth-callback-handler";

/**
 * OAuth (Google) returns here with `?code=`. We exchange it for a session cookie (PKCE),
 * then require the signed-in email to be on `allowed_emails` via `is_allowlisted_session()`.
 * Add this URL in Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export async function GET(request: NextRequest) {
  return handleOAuthCallback(request);
}
