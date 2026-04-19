import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SwadhyayPostsFeed } from "@/components/swadhyay/swadhyay-posts-feed";
import { SwadhyayTopicRealtime } from "@/components/swadhyay/swadhyay-topic-realtime";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { getActiveSwadhyayTopic, getTopicPosts } from "@/lib/swadhyay/queries";

export const metadata = { title: "Swadhyay — MananChintan" };

export const dynamic = "force-dynamic";

function formatRange(startISO: string, endISO: string): string {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const monthFmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const endFmt: Intl.DateTimeFormatOptions = sameMonth
    ? { day: "numeric" }
    : { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, monthFmt)} – ${end.toLocaleDateString(undefined, endFmt)}`;
}

export default async function SwadhyayPage() {
  const { user } = await requireAllowlistedUser();
  const isOrganizer = await getIsOrganizerSession();
  const today = getCampaignDateTodayISO();
  const topic = await getActiveSwadhyayTopic();
  const posts = topic ? await getTopicPosts(topic.id) : [];

  const canPost = Boolean(
    topic &&
      topic.is_published &&
      today >= topic.start_date &&
      today <= topic.end_date,
  );

  return (
    <div className="layout-reading space-y-5">
      <header className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 shadow-sm transition-shadow duration-[200ms] ease-[var(--ease-out-standard)] hover:shadow-md">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
          Swadhyay
        </h1>
      </header>

      {!topic ? (
        <>
          <SwadhyayTopicRealtime campaignDate={today} />
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
          <Card className="ring-border/60">
            <CardHeader className="border-b border-border/60 pb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                {formatRange(topic.start_date, topic.end_date)} · Weekly theme
              </p>
              <CardTitle className="mt-1 text-xl">{topic.title}</CardTitle>
            </CardHeader>
            {topic.description.trim() ? (
              <CardContent className="pt-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                  {topic.description}
                </p>
              </CardContent>
            ) : null}
          </Card>

          <SwadhyayPostsFeed
            topic={topic}
            currentUserId={user.id}
            isOrganizer={isOrganizer}
            canPost={canPost}
            posts={posts}
          />
        </>
      )}
    </div>
  );
}
