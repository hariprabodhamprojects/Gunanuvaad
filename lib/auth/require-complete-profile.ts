import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Ensures `profiles.display_name` and `profiles.avatar_url` are set.
 * Call after `requireAllowlistedUser` in the main app shell only.
 */
const PROFILE_CHECK_MS = 5_000;

export async function requireCompleteProfile(userId: string): Promise<void> {
  const supabase = await createClient();
  let profile: { display_name: string | null; avatar_url: string | null } | null = null;
  let error: { message: string } | null = null;

  try {
    const result = await Promise.race([
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("profile_check_timeout")), PROFILE_CHECK_MS);
      }),
    ]);
    profile = result.data;
    error = result.error;
  } catch (e) {
    if (e instanceof Error && e.message === "profile_check_timeout") {
      redirect("/?error=auth");
    }
    redirect("/onboarding");
  }

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
