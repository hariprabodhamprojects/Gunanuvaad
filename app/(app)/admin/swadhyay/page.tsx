import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SwadhyayTopicForm } from "@/components/admin/swadhyay-topic-form";
import { SwadhyayModerationList } from "@/components/admin/swadhyay-moderation-list";
import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { getAllSwadhyayTopics } from "@/lib/swadhyay/queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Swadhyay — Admin",
};

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  "missing-fields": "Please fill in all required fields.",
  "title-too-long": "Title is too long (max 200 characters).",
  "description-too-long": "Description is too long.",
  "date-order": "End date must be on or after start date.",
  overlap: "Another published topic overlaps these dates. Adjust the range or unpublish one.",
  "save-failed": "Could not save topic. Try again.",
  "delete-failed": "Could not delete topic.",
  "not-signed-in": "Session expired — sign in again.",
};

const OK_COPY: Record<string, string> = {
  created: "Topic created.",
  updated: "Topic updated.",
  deleted: "Topic deleted.",
};

type SearchParams = Promise<{ error?: string; ok?: string }>;

export default async function AdminSwadhyayPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [topics, { error, ok }] = await Promise.all([
    getAllSwadhyayTopics(),
    searchParams,
  ]);
  const today = getCampaignDateTodayISO();

  const active = topics.filter(
    (t) => t.is_published && today >= t.start_date && today <= t.end_date,
  );
  const upcoming = topics.filter((t) => t.start_date > today);
  const past = topics.filter(
    (t) => t.end_date < today && !active.some((a) => a.id === t.id),
  );

  return (
    <div className="space-y-6">
      <header className="page-hero rounded-3xl border border-border/60 bg-card/70 px-5 py-5 shadow-sm transition-shadow duration-[var(--motion-base)] ease-[var(--ease-out-standard)] hover:shadow-md sm:px-7">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary sm:text-[28px]">
          Swadhyay
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan weekly themes and moderate member reflections.
        </p>
      </header>

      {error && ERROR_COPY[error] ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {ERROR_COPY[error]}
        </div>
      ) : null}
      {ok && OK_COPY[ok] ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
          {OK_COPY[ok]}
        </div>
      ) : null}

      <Card className="ring-border/60">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Create a weekly topic</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <SwadhyayTopicForm mode="create" />
        </CardContent>
      </Card>

      {topics.length > 0 ? (
        <Card className="ring-border/60">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">All topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {active.length > 0 ? (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Active
                </h3>
                <div className="mt-2 space-y-3">
                  {active.map((t) => (
                    <TopicRow key={t.id} topic={t} tone="active" />
                  ))}
                </div>
              </section>
            ) : null}

            {upcoming.length > 0 ? (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                  Upcoming
                </h3>
                <div className="mt-2 space-y-3">
                  {upcoming.map((t) => (
                    <TopicRow key={t.id} topic={t} tone="upcoming" />
                  ))}
                </div>
              </section>
            ) : null}

            {past.length > 0 ? (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                  Past
                </h3>
                <div className="mt-2 space-y-3">
                  {past.map((t) => (
                    <TopicRow key={t.id} topic={t} tone="past" />
                  ))}
                </div>
              </section>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="ring-border/60">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Moderation</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <SwadhyayModerationList
            topics={topics}
            initialTopicId={active[0]?.id ?? topics[0]?.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function TopicRow({
  topic,
  tone,
}: {
  topic: import("@/lib/swadhyay/types").SwadhyayTopic;
  tone: "active" | "upcoming" | "past";
}) {
  return (
    <details
      className={cn(
        "rounded-xl border bg-card/60 transition-colors",
        tone === "active"
          ? "border-primary/40"
          : tone === "upcoming"
            ? "border-border/70"
            : "border-border/40",
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{topic.title}</p>
          <p className="text-[11px] text-foreground/55">
            {topic.start_date} → {topic.end_date}
            {!topic.is_published ? (
              <span className="ml-2 rounded-sm bg-muted px-1 text-[10px] uppercase tracking-wide text-foreground/60">
                draft
              </span>
            ) : null}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-primary group-open:hidden">
          Edit
        </span>
      </summary>
      <div className="border-t border-border/50 px-3 py-3">
        <SwadhyayTopicForm mode="edit" topic={topic} />
      </div>
    </details>
  );
}
