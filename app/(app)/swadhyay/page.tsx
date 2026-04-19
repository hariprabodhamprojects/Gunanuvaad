import { Card, CardContent } from "@/components/ui/card";
import { SwadhyayPostsFeed } from "@/components/swadhyay/swadhyay-posts-feed";
import { SwadhyayTopicRealtime } from "@/components/swadhyay/swadhyay-topic-realtime";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { getActiveSwadhyayTopic, getTopicPosts } from "@/lib/swadhyay/queries";

export const metadata = { title: "Swadhyay — MananChintan" };

export const dynamic = "force-dynamic";

/** Inclusive day index (1-based) and total week length in days. */
function weekProgress(startISO: string, endISO: string, todayISO: string) {
  const start = new Date(`${startISO}T00:00:00`).getTime();
  const end = new Date(`${endISO}T00:00:00`).getTime();
  const today = new Date(`${todayISO}T00:00:00`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const total = Math.max(1, Math.round((end - start) / dayMs) + 1);
  const raw = Math.round((today - start) / dayMs) + 1;
  const current = Math.min(total, Math.max(1, raw));
  return { current, total, pct: Math.round((current / total) * 100) };
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

  const progress = topic ? weekProgress(topic.start_date, topic.end_date, today) : null;

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
          {/* Hero — just the topic title and a small meta row (date range +
              live day indicator). The `.page-hero` utility (see globals.css)
              layers the warm primary mesh and the top hairline highlight. */}
          <section
            aria-labelledby="swadhyay-topic-title"
            className="page-hero rounded-3xl border border-border/60 bg-card/70 px-5 py-6 shadow-sm sm:px-7 sm:py-7"
          >
            <div className="flex items-end justify-between gap-4">
              <h1
                id="swadhyay-topic-title"
                className="font-heading text-[28px] font-semibold leading-tight tracking-tight text-primary sm:text-[34px]"
              >
                {topic.title}
              </h1>
              {progress ? (
                <span
                  className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary shadow-sm backdrop-blur-sm"
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
                className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-primary/10"
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
            isOrganizer={isOrganizer}
            canPost={canPost}
            posts={posts}
          />
        </>
      )}
    </div>
  );
}
