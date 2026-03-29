import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StandingsEntry, StandingsPayload } from "@/lib/standings/types";
import { cn } from "@/lib/utils";

/** One tint per dense-rank band: everyone tied at 1st → gold, 2nd → silver, 3rd → darker bronze. */
function podiumTint(rank: number): string {
  if (rank === 1) {
    return "bg-amber-400/28 ring-1 ring-amber-600/50 dark:bg-amber-500/22 dark:ring-amber-400/45";
  }
  if (rank === 2) {
    return "bg-slate-400/30 ring-1 ring-slate-500/55 dark:bg-slate-500/25 dark:ring-slate-400/50";
  }
  if (rank === 3) {
    return "bg-amber-950/28 ring-1 ring-orange-950/60 dark:bg-amber-950/40 dark:ring-orange-900/55";
  }
  return "";
}

function podiumRankClass(rank: number): string {
  if (rank === 1) return "text-amber-900 dark:text-amber-300";
  if (rank === 2) return "text-slate-700 dark:text-slate-200";
  if (rank === 3) return "text-orange-950 dark:text-orange-400";
  return "text-muted-foreground";
}

function LeaderboardTable({
  rows,
  viewerId,
  valueKey,
}: {
  rows: StandingsEntry[];
  viewerId: string;
  valueKey: "score" | "streak";
}) {
  if (rows.length === 0) {
    return <div className="py-10" aria-hidden />;
  }

  return (
    <ul className="divide-y divide-border/60" role="list">
      {rows.map((row) => {
        const isViewer = row.id === viewerId;
        const val = valueKey === "score" ? row.score ?? 0 : row.streak ?? 0;
        return (
          <li
            key={`${valueKey}-${row.id}`}
            className={cn(
              "flex items-center gap-3 py-3 sm:gap-4",
              podiumTint(row.rank),
              row.rank <= 3 && "rounded-lg px-2 -mx-2 sm:px-3 sm:-mx-3",
              isViewer && row.rank > 3 && "rounded-lg bg-primary/8 px-2 -mx-2 sm:px-3 sm:-mx-3",
              isViewer && row.rank <= 3 && "ring-2 ring-primary/55 ring-offset-2 ring-offset-background dark:ring-offset-background",
            )}
          >
            <span
              className={cn(
                "w-8 shrink-0 text-center font-heading text-sm font-semibold tabular-nums sm:w-10",
                podiumRankClass(row.rank),
              )}
            >
              {row.rank}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.avatar_url}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover ring-2 ring-border/70 sm:size-11"
            />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate font-medium", isViewer && "text-primary")}>
                {row.display_name}
                {isViewer ? <span className="sr-only"> (you)</span> : null}
              </p>
            </div>
            <span className="shrink-0 font-heading text-sm font-semibold tabular-nums sm:text-base">
              {val}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function StandingsView({ data }: { data: StandingsPayload }) {
  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Standings</h1>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base font-semibold">Points</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <LeaderboardTable rows={data.points} viewerId={data.viewer_id} valueKey="score" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base font-semibold">Streak</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <LeaderboardTable rows={data.streaks} viewerId={data.viewer_id} valueKey="streak" />
        </CardContent>
      </Card>
    </div>
  );
}
