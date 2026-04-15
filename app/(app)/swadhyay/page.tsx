import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SwadhyayComments } from "@/components/swadhyay/swadhyay-comments";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { getTodaySwadhyayTopic, getTopicComments } from "@/lib/swadhyay/queries";

export const metadata = { title: "Swadhyay — MananChintan" };

export const dynamic = "force-dynamic";

export default async function SwadhyayPage() {
  const { user } = await requireAllowlistedUser();
  const isOrganizer = await getIsOrganizerSession();
  const topic = await getTodaySwadhyayTopic();
  const comments = topic ? await getTopicComments(topic.id) : [];

  return (
    <div className="layout-reading space-y-5">
      <header className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 shadow-sm transition-shadow duration-[200ms] ease-[var(--ease-out-standard)] hover:shadow-md">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Swadhyay</h1>
      </header>

      {!topic ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-12 text-center text-sm text-muted-foreground">
          Today&apos;s Swadhyay topic is not published yet.
        </p>
      ) : (
        <>
          <Card className="ring-border/60">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-lg">{topic.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{topic.body}</p>
              {topic.scripture_ref ? (
                <p className="text-xs font-medium text-primary/90">Reference: {topic.scripture_ref}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="ring-border/60">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base">Discussion ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <SwadhyayComments
                topic={topic}
                currentUserId={user.id}
                isOrganizer={isOrganizer}
                comments={comments}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
