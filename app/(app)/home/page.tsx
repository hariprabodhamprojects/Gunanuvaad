import { ApprovedNotesSlideshow } from "@/components/home/approved-notes-slideshow";
import { CampaignDayNotification } from "@/components/notes/campaign-day-ux";
import { RosterPickExperience } from "@/components/roster/roster-pick-experience";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { getApprovedNotesSlideshowSlides } from "@/lib/home/approved-slideshow";
import { getDailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
import { getRosterMembers } from "@/lib/roster/get-roster";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Home — Gunanuvad",
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
  
  // Get all members
  const allMembers = await getRosterMembers();

  // Get last 25 people I wrote about
  const { data: recentNotes } = await supabase
    .from("notes")
    .select("recipient_id")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  const restrictedIds = new Set((recentNotes || []).map((n) => n.recipient_id));
  restrictedIds.add(user.id); // Prevent writing to self just in case

  // Filter roster
  const members = allMembers.filter(m => !restrictedIds.has(m.id));

  const approvedSlides = await getApprovedNotesSlideshowSlides(5);
  const dailyCampaignStatus = await getDailyCampaignStatus(user.id);

  return (
    <div className="space-y-5">
      <CampaignDayNotification userId={user.id} status={dailyCampaignStatus} />
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Jay Swaminarayan
          {displayName ? (
            <>
              {" "}
              <span className="text-primary">{displayName}</span>
            </>
          ) : null}
        </h1>
      </header>
      <ApprovedNotesSlideshow slides={approvedSlides} />
      <RosterPickExperience
        members={members}
        currentUserId={user.id}
        dailyCampaignStatus={dailyCampaignStatus}
      />
    </div>
  );
}
