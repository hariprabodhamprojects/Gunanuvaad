import { redirect } from "next/navigation";
import { OnboardingMissingName } from "@/components/onboarding-missing-name";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/onboarding");
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

  if (!hasName) {
    return <OnboardingMissingName />;
  }

  return <OnboardingWizard />;
}
