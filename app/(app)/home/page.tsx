import Link from "next/link";
import { SquareStack } from "lucide-react";
import { ApprovedNotesSlideshow } from "@/components/home/approved-notes-slideshow";
import { MotionPageHero } from "@/components/motion-page-hero";
import { CampaignDayNotification } from "@/components/notes/campaign-day-ux";
import { RosterPickExperience } from "@/components/roster/roster-pick-experience";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { cn } from "@/lib/utils";
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
      <Card className="overflow-hidden border-border/60 bg-card/70 ring-border/40">
        <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <SquareStack className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Feed & Smruti</p>
              <p className="text-xs text-muted-foreground">
                See everyone&apos;s posts on Feed; share photos with a caption from Smruti.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/feed" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              View feed
            </Link>
            <Link href="/smruti/new" className={cn(buttonVariants({ size: "sm" }))}>
              New post
            </Link>
          </div>
        </CardContent>
      </Card>
      <ApprovedNotesSlideshow slides={approvedSlides} />
      <RosterPickExperience
        members={members}
        currentUserId={user.id}
        dailyCampaignStatus={dailyCampaignStatus}
      />
    </div>
  );
}
