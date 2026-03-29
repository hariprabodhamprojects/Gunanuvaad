import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Ensures `profiles.display_name` and `profiles.avatar_url` are set.
 * Call after `requireAllowlistedUser` in the main app shell only.
 */
export async function requireCompleteProfile(userId: string): Promise<void> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] profile check failed", error.message);
    redirect("/onboarding");
  }

  const hasName = Boolean(profile?.display_name?.trim());
  const hasAvatar = Boolean(profile?.avatar_url?.trim());
  if (!hasName || !hasAvatar) {
    redirect("/onboarding");
  }
}
