import { MeProfileSummary } from "@/components/me-profile-summary";
import { MeSettingsCard } from "@/components/me-settings-card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Me — MananChintan",
};

export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?next=/me");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name?.trim();
  const avatarUrl = profile?.avatar_url?.trim();
  if (!displayName || !avatarUrl) {
    redirect("/onboarding");
  }

  const email = profile?.email || user.email || "";

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <MeProfileSummary displayName={displayName} avatarUrl={avatarUrl} email={email} />
      <MeSettingsCard email={email} />
    </div>
  );
}
