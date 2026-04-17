import { ApprovedNotesSlideshow } from "@/components/home/approved-notes-slideshow";
import { CampaignDayNotification } from "@/components/notes/campaign-day-ux";
import { RosterPickExperience } from "@/components/roster/roster-pick-experience";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { getApprovedNotesSlideshowSlides } from "@/lib/home/approved-slideshow";
import { getDailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
import { getRosterMembers } from "@/lib/roster/get-roster";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Home — MananChintan",
};

export const dynamic = "force-dynamic";

/**
 * Home — same screen as roster: one hub, no extra hop to another route.
 */
export default async function HomePage() {
  const { user } = await requireAllowlistedUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name?.trim() ?? "";
  const members = await getRosterMembers();

  const approvedSlides = await getApprovedNotesSlideshowSlides(5);
  const dailyCampaignStatus = await getDailyCampaignStatus(user.id);

  return (
    <div className="layout-reading space-y-6">
      <CampaignDayNotification userId={user.id} status={dailyCampaignStatus} />
      <h1 className="px-1 font-heading text-2xl font-semibold tracking-tight">
        Jay Swaminarayan
        {displayName ? (
          <>
            {" "}
            <span className="text-primary">{displayName}</span>
          </>
        ) : null}
        {" "}
        !
      </h1>
      <ApprovedNotesSlideshow slides={approvedSlides} />
      <RosterPickExperience
        members={members}
        currentUserId={user.id}
        dailyCampaignStatus={dailyCampaignStatus}
      />
    </div>
  );
}
