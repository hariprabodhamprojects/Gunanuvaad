import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?next=/onboarding");
  }

  const { data: allowed, error: allowErr } = await supabase.rpc("is_allowlisted_session");
  if (allowErr) {
    console.error("[onboarding] is_allowlisted_session", allowErr.message);
    redirect("/?error=auth");
  }
  if (!allowed) {
    await supabase.auth.signOut();
    redirect("/not-invited");
  }

  const { error: syncErr } = await supabase.rpc("sync_invited_display_name");
  if (syncErr) {
    console.error("[onboarding] sync_invited_display_name", syncErr.message);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const hasName = Boolean(profile?.display_name?.trim());
  const hasAvatar = Boolean(profile?.avatar_url?.trim());

  if (hasName && hasAvatar) {
    redirect("/home");
  }

  return <OnboardingWizard />;
}
