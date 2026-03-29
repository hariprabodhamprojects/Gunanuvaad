import { createClient } from "@/lib/supabase/client";

/**
 * Browser-only: starts Google OAuth. Call from client components only.
 */
export async function startGoogleOAuth(redirectNext: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const next = redirectNext.startsWith("/") ? redirectNext : "/home";
  const supabase = createClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { ok: false, message: error.message };
  if (data.url) {
    window.location.href = data.url;
    return { ok: true };
  }
  return { ok: false, message: "Could not start Google sign-in." };
}
