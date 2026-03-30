import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StandingsEntry, StandingsPayload } from "@/lib/standings/types";
import { cn } from "@/lib/utils";

/**
 * Dense-rank bands: gold / silver / bronze.
 * Dark mode: cool slate card + warm metal accents (avoid muddy brown fills).
 */
function podiumTint(rank: number): string {
  if (rank === 1) {
    return [
      "bg-amber-400/28 ring-1 ring-amber-600/45",
      "dark:bg-amber-400/[0.11] dark:ring-amber-200/22",
      "dark:shadow-[inset_0_1px_0_0_rgba(253,230,138,0.14)]",
    ].join(" ");
  }
  if (rank === 2) {
    return [
      "bg-slate-400/30 ring-1 ring-slate-500/50",
      "dark:bg-slate-300/[0.09] dark:ring-slate-200/22",
      "dark:shadow-[inset_0_1px_0_0_rgba(226,232,240,0.12)]",
    ].join(" ");
  }
  if (rank === 3) {
    return [
      "bg-amber-950/28 ring-1 ring-orange-950/45",
      "dark:bg-orange-400/[0.09] dark:ring-orange-200/20",
      "dark:shadow-[inset_0_1px_0_0_rgba(254,215,170,0.12)]",
    ].join(" ");
  }
  return "";
}

/** Inset ring for “you” on podium — matches row metal, slightly stronger so it never looks like a bug. */
function viewerPodiumInsetRing(rank: number): string {
  if (rank === 1) {
    return "ring-2 ring-inset ring-amber-600/45 dark:ring-amber-100/28";
  }
  if (rank === 2) {
    return "ring-2 ring-inset ring-slate-500/45 dark:ring-slate-100/26";
  }
  if (rank === 3) {
    return "ring-2 ring-inset ring-amber-800/42 dark:ring-orange-100/26";
  }
  return "";
}

function podiumRankClass(rank: number): string {
  if (rank === 1) return "text-amber-900 dark:text-amber-100";
  if (rank === 2) return "text-slate-700 dark:text-slate-100";
  if (rank === 3) return "text-orange-950 dark:text-orange-100";
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
              isViewer && row.rank <= 3 && viewerPodiumInsetRing(row.rank),
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
              <p className={cn("truncate font-medium", isViewer && "font-semibold")}>
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
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground drop-shadow-sm px-1">Standings</h1>

      <div className="glass-card mb-6">
        <div className="px-5 py-4 border-b border-border/40">
          <h2 className="text-xl font-bold tracking-tight text-primary drop-shadow-sm">Points 🏆</h2>
        </div>
        <div className="p-4 pt-2">
          <LeaderboardTable rows={data.points} viewerId={data.viewer_id} valueKey="score" />
        </div>
      </div>

      <div className="glass-card mb-6">
        <div className="px-5 py-4 border-b border-border/40">
          <h2 className="text-xl font-bold tracking-tight text-primary drop-shadow-sm">Streak 🔥</h2>
        </div>
        <div className="p-4 pt-2">
          <LeaderboardTable rows={data.streaks} viewerId={data.viewer_id} valueKey="streak" />
        </div>
      </div>
    </div>
  );
}
