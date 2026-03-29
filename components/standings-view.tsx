import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StandingsEntry, StandingsPayload } from "@/lib/standings/types";
import { cn } from "@/lib/utils";

function LeaderboardTable({
  rows,
  viewerId,
  valueKey,
  valueLabel,
}: {
  rows: StandingsEntry[];
  viewerId: string;
  valueKey: "score" | "streak";
  valueLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No data yet — send your first note.</p>
    );
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
              isViewer && "rounded-lg bg-primary/8 px-2 -mx-2 sm:px-3 sm:-mx-3",
            )}
          >
            <span className="w-8 shrink-0 text-center font-heading text-sm font-semibold tabular-nums text-muted-foreground sm:w-10">
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
              <span className="sr-only"> {valueLabel}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function StandingsView({ data }: { data: StandingsPayload }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Standings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rankings use notes sent in the group. Streaks count consecutive days (campaign calendar) with at
          least one note.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">By notes sent</CardTitle>
          <CardDescription>Total appreciations you&apos;ve sent.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <LeaderboardTable
            rows={data.points}
            viewerId={data.viewer_id}
            valueKey="score"
            valueLabel="notes"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">By current streak</CardTitle>
          <CardDescription>Longest run of back-to-back days with a note, from your latest day.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <LeaderboardTable
            rows={data.streaks}
            viewerId={data.viewer_id}
            valueKey="streak"
            valueLabel="days"
          />
        </CardContent>
      </Card>
    </div>
  );
}
