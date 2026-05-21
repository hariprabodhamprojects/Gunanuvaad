import { Suspense } from "react";
import { HomeRosterSection } from "@/components/home/home-roster-section";
import { HomeRosterSkeleton, HomeSpotlightSkeleton } from "@/components/home/home-section-skeletons";
import { HomeSpotlightSection } from "@/components/home/home-spotlight-section";
import { MotionPageHero } from "@/components/motion-page-hero";
import { CampaignDayNotification } from "@/components/notes/campaign-day-ux";
import { getAllowlistedUser } from "@/lib/auth/get-allowlisted-user";
import { getDailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Home — MananChintan",
};

export const dynamic = "force-dynamic";

/**
 * Home — hero + campaign load first; spotlight and roster stream in (no prefetch flood).
 */
export default async function HomePage() {
  const { user } = await getAllowlistedUser();
  const supabase = await createClient();

  const [{ data: profile }, dailyCampaignStatus] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    getDailyCampaignStatus(user.id),
  ]);

  const displayName = profile?.display_name?.trim() ?? "";

  return (
    <div className="layout-reading space-y-6">
      <CampaignDayNotification userId={user.id} status={dailyCampaignStatus} />
      <MotionPageHero>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          Jay Swaminarayan
          {displayName ? (
            <>
              {" "}
              <span className="text-primary">{displayName}</span>
            </>
          ) : null}{" "}
          !
        </h1>
      </MotionPageHero>
      <Suspense fallback={<HomeSpotlightSkeleton />}>
        <HomeSpotlightSection />
      </Suspense>
      <Suspense fallback={<HomeRosterSkeleton />}>
        <HomeRosterSection
          currentUserId={user.id}
          dailyCampaignStatus={dailyCampaignStatus}
        />
      </Suspense>
    </div>
  );
}
