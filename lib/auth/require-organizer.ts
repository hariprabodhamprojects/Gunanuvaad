import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";

/** For shell UI (e.g. show Admin link). Fails closed on RPC error. */
export async function getIsOrganizerSession(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_organizer_session");
  if (error) {
    console.error("[auth] is_organizer_session", error.message);
    return false;
  }
  return Boolean(data);
}

/**
 * Allowlisted users only. Non-organizers → `/home`.
 * Use on `/admin` routes.
 */
export async function requireOrganizer() {
  const allowlisted = await requireAllowlistedUser();
  const supabase = await createClient();
  const { data: isOrganizer, error } = await supabase.rpc("is_organizer_session");

  if (error) {
    console.error("[auth] is_organizer_session failed", error.message);
    redirect("/home");
  }

  if (!isOrganizer) {
    redirect("/home");
  }

  return allowlisted;
}
