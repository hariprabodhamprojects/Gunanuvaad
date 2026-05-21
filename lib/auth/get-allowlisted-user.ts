import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { resolveSessionUser } from "@/lib/supabase/resolve-session-user";
import type { AllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { resolveSessionEmail } from "@/lib/auth/resolve-session-email";

/**
 * Cached per request. Uses cookie session first (no network) — middleware already
 * refreshed the token when it was close to expiring.
 */
export const getAllowlistedUser = cache(async (): Promise<AllowlistedUser> => {
  const supabase = await createClient();

  let user: User | null =
    (await supabase.auth.getSession()).data.session?.user ?? null;

  if (!user) {
    user = await resolveSessionUser(supabase);
  }

  if (!user) {
    redirect("/?next=/home");
  }

  const email = resolveSessionEmail(user);
  if (!email) {
    await supabase.auth.signOut();
    redirect("/not-invited");
  }

  const { data: allowed, error } = await supabase.rpc("is_allowlisted_session");

  if (error) {
    console.error("[auth] allowlist check failed", error.message);
    redirect("/?error=auth");
  }

  if (!allowed) {
    await supabase.auth.signOut();
    redirect("/not-invited");
  }

  return { user, email };
});
