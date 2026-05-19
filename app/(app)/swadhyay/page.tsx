import { Card, CardContent } from "@/components/ui/card";
import { SwadhyayPostsFeed } from "@/components/swadhyay/swadhyay-posts-feed";
import { SwadhyayTopicRealtime } from "@/components/swadhyay/swadhyay-topic-realtime";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { getActiveSwadhyayTopic, getTopicPosts } from "@/lib/swadhyay/queries";
import {
  formatSwadhyayWeekRange,
  swadhyayWeekProgress,
} from "@/lib/swadhyay/topic-dates";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Swadhyay — MananChintan" };

export const dynamic = "force-dynamic";

export default async function SwadhyayPage() {
  const { user } = await requireAllowlistedUser();
  const supabase = await createClient();
  const isOrganizer = await getIsOrganizerSession();
  const today = getCampaignDateTodayISO();
  const topic = await getActiveSwadhyayTopic();
  const [posts, profileRes] = await Promise.all([
    topic ? getTopicPosts(topic.id) : Promise.resolve([]),
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
  ]);
  const currentUserDisplayName = profileRes.data?.display_name?.trim() || "You";
  const currentUserAvatarUrl = profileRes.data?.avatar_url?.trim() || "";

  const canPost = Boolean(
    topic &&
      topic.is_published &&
      today >= topic.start_date &&
      today <= topic.end_date,
  );

  const weekRange = topic ? formatSwadhyayWeekRange(topic.start_date, topic.end_date) : null;
  const progress = topic ? swadhyayWeekProgress(topic.start_date, topic.end_date, today) : null;

  return (
    <div className="layout-reading space-y-5">
      {!topic ? (
        <>
          <SwadhyayTopicRealtime campaignDate={today} />
          <header className="page-hero rounded-3xl border border-border/60 bg-card/70 px-5 py-5 shadow-sm">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary sm:text-[28px]">
              Swadhyay
            </h1>
          </header>
          <Card className="ring-border/60">
            <CardContent className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No active Swadhyay theme right now.
              </p>
              <p className="mt-1 text-xs text-foreground/55">
                The organizer will set one soon — check back shortly.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <section
            aria-labelledby="swadhyay-topic-title"
            className="page-hero rounded-3xl border border-border/60 bg-card/70 px-5 py-5 shadow-sm sm:px-7"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1
                  id="swadhyay-topic-title"
                  className="truncate font-heading text-2xl font-semibold tracking-tight text-primary sm:text-[28px]"
                >
                  {topic.title}
                </h1>
                {weekRange ? (
                  <p className="mt-1 text-xs text-muted-foreground sm:text-[13px]">
                    Week of {weekRange}
                  </p>
                ) : null}
              </div>
              {progress ? (
                <span
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary shadow-sm backdrop-blur-sm"
                  title={`Day ${progress.current} of ${progress.total}`}
                >
                  <span
                    aria-hidden
                    className="relative inline-flex size-1.5 rounded-full bg-primary"
                  >
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
                  </span>
                  Day {progress.current} / {progress.total}
                </span>
              ) : null}
            </div>

            {progress ? (
              <div
                className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-primary/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.current}
                aria-label="Week progress"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 transition-[width] duration-[600ms] ease-[var(--ease-emphasized)]"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            ) : null}
          </section>

          <SwadhyayPostsFeed
            topic={topic}
            currentUserId={user.id}
            currentUserDisplayName={currentUserDisplayName}
            currentUserAvatarUrl={currentUserAvatarUrl}
            isOrganizer={isOrganizer}
            canPost={canPost}
            posts={posts}
          />
        </>
      )}
    </div>
  );
}
