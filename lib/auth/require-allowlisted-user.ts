import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getUserWithTimeout, rpcBooleanWithTimeout } from "@/lib/supabase/auth-timeout";
import { createClient } from "@/lib/supabase/server";

export type AllowlistedUser = {
  user: User;
  email: string;
};

/** Prefer JWT email; fall back to metadata/identities if the provider omits the top-level field. */
function resolveSessionEmail(user: User): string | null {
  const direct = user.email?.trim();
  if (direct) return direct.toLowerCase();
  const meta = user.user_metadata?.email;
  if (typeof meta === "string" && meta.trim()) return meta.trim().toLowerCase();
  const fromIdent = user.identities?.[0]?.identity_data;
  if (fromIdent && typeof fromIdent === "object" && "email" in fromIdent) {
    const e = (fromIdent as { email?: string }).email;
    if (typeof e === "string" && e.trim()) return e.trim().toLowerCase();
  }
  return null;
}

/**
 * Use in `app/(app)/layout.tsx` (and later any protected Server Component).
 * - No session → `/` (splash + Google)
 * - Session but email not in `allowed_emails` → sign out + `/not-invited`
 *
 * Allowlist is enforced via RPC `is_allowlisted_session()` (matches auth.users ↔ allowed_emails
 * in SQL Editor; avoids RLS quirks on direct `select` from `allowed_emails`).
 */
export async function requireAllowlistedUser(): Promise<AllowlistedUser> {
  const supabase = await createClient();
  const { user, timedOut: userTimedOut } = await getUserWithTimeout(supabase);

  if (userTimedOut) {
    redirect("/?error=auth");
  }

  if (!user) {
    redirect("/?next=/home");
  }

  const email = resolveSessionEmail(user);
  if (!email) {
    await supabase.auth.signOut();
    redirect("/not-invited");
  }

  const { value: allowed, timedOut: allowTimedOut, error } =
    await rpcBooleanWithTimeout(supabase, "is_allowlisted_session");

  if (allowTimedOut) {
    redirect("/?error=auth");
  }

  if (error) {
    console.error("[auth] allowlist check failed", error.message);
    await supabase.auth.signOut();
    redirect("/not-invited");
  }

  if (!allowed) {
    await supabase.auth.signOut();
    redirect("/not-invited");
  }

  return { user, email };
}
