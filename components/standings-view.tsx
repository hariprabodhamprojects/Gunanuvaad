import { StandingsEntry, StandingsPayload } from "@/lib/standings/types";
import { cn } from "@/lib/utils";

function podiumTint(rank: number): string {
  if (rank === 1) {
    return "bg-amber-100/50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20";
  }
  if (rank === 2) {
    return "bg-slate-100/50 dark:bg-slate-400/10 border-slate-200/50 dark:border-slate-500/20";
  }
  if (rank === 3) {
    return "bg-amber-50/50 dark:bg-orange-800/10 border-amber-100/50 dark:border-orange-500/20";
  }
  return "bg-transparent border-transparent";
}

function podiumRankClass(rank: number): string {
  if (rank === 1) return "text-amber-600 dark:text-amber-400 font-bold";
  if (rank === 2) return "text-slate-500 dark:text-slate-400 font-bold";
  if (rank === 3) return "text-amber-700 dark:text-orange-400 font-bold";
  return "text-muted-foreground font-medium";
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
    return <div className="py-10 text-center text-sm text-muted-foreground">No data available</div>;
  }

  return (
    <ul className="flex flex-col gap-2" role="list">
      {rows.map((row) => {
        const isViewer = row.id === viewerId;
        const val = valueKey === "score" ? row.score ?? 0 : row.streak ?? 0;
        const isPodium = row.rank <= 3;

        return (
          <li
            key={`${valueKey}-${row.id}`}
            className={cn(
              "flex items-center gap-4 py-2.5 px-3 sm:px-4 rounded-xl border transition-colors",
              podiumTint(row.rank),
              isViewer && "ring-1 ring-primary/40 bg-primary/5",
              !isPodium && !isViewer && "hover:bg-muted/40"
            )}
          >
            <span
              className={cn(
                "w-6 shrink-0 text-center tabular-nums text-sm",
                podiumRankClass(row.rank)
              )}
            >
              {row.rank}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.avatar_url}
              alt=""
              className={cn(
                "size-10 object-cover rounded-full ring-1",
                isPodium ? "ring-white/80 dark:ring-white/20" : "ring-border"
              )}
            />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm font-medium", isViewer && "font-semibold text-primary")}>
                {row.display_name}
                {isViewer && <span className="ml-2 text-[10px] uppercase font-bold tracking-wider opacity-60">(You)</span>}
              </p>
            </div>
            <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground px-1">
        Standings
      </h1>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
          <h2 className="text-lg font-semibold tracking-tight">Points</h2>
        </div>
        <div className="p-4 sm:p-5">
          <LeaderboardTable rows={data.points} viewerId={data.viewer_id} valueKey="score" />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
          <h2 className="text-lg font-semibold tracking-tight">Longest Streak</h2>
        </div>
        <div className="p-4 sm:p-5">
          <LeaderboardTable rows={data.streaks} viewerId={data.viewer_id} valueKey="streak" />
        </div>
      </div>
    </div>
  );
}
