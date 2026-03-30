import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StandingsEntry, StandingsPayload } from "@/lib/standings/types";
import { cn } from "@/lib/utils";

/**
 * Dense-rank bands: gold / silver / bronze.
 * Gamified 3D glows and heavy borders.
 */
function podiumTint(rank: number): string {
  if (rank === 1) {
    return [
      "bg-amber-400/30 border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6),inset_0_0_15px_rgba(251,191,36,0.3)] transform-gpu scale-[1.03] z-10",
      "dark:bg-amber-500/20 dark:border-amber-400 dark:shadow-[0_0_30px_rgba(251,191,36,0.4),inset_0_0_20px_rgba(251,191,36,0.2)]",
      "animate-neon-pulse",
    ].join(" ");
  }
  if (rank === 2) {
    return [
      "bg-slate-300/30 border-2 border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.5),inset_0_0_10px_rgba(203,213,225,0.2)] transform-gpu scale-[1.01] z-[9]",
      "dark:bg-slate-400/20 dark:border-slate-300 dark:shadow-[0_0_20px_rgba(203,213,225,0.3),inset_0_0_15px_rgba(203,213,225,0.1)]",
    ].join(" ");
  }
  if (rank === 3) {
    return [
      "bg-amber-800/30 border-2 border-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.5),inset_0_0_10px_rgba(180,83,9,0.2)] z-[8]",
      "dark:bg-orange-800/30 dark:border-orange-600 dark:shadow-[0_0_20px_rgba(234,88,12,0.3),inset_0_0_15px_rgba(234,88,12,0.1)]",
    ].join(" ");
  }
  return "";
}

/** Inset ring for “you” on podium — matches row metal, slightly stronger so it never looks like a bug. */
function viewerPodiumInsetRing(rank: number): string {
  if (rank === 1) {
    return "ring-4 ring-inset ring-amber-500/80 dark:ring-amber-300/80";
  }
  if (rank === 2) {
    return "ring-4 ring-inset ring-slate-400/80 dark:ring-slate-300/80";
  }
  if (rank === 3) {
    return "ring-4 ring-inset ring-amber-700/80 dark:ring-orange-500/80";
  }
  return "ring-2 ring-inset ring-primary/80 bg-primary/10";
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
    <ul className="divide-y-0 space-y-3" role="list" style={{ perspective: "1000px" }}>
      {rows.map((row) => {
        const isViewer = row.id === viewerId;
        const val = valueKey === "score" ? row.score ?? 0 : row.streak ?? 0;
        return (
          <li
            key={`${valueKey}-${row.id}`}
            className={cn(
              "relative flex items-center gap-3 py-3 sm:gap-4 px-3 sm:px-4 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-surface/40 backdrop-blur-md border border-border/50",
              podiumTint(row.rank),
              isViewer && viewerPodiumInsetRing(row.rank),
              row.rank > 3 && isViewer && "shadow-[0_0_15px_rgba(250,115,22,0.4)] border-primary",
            )}
            style={{ transformStyle: "preserve-3d" }}
          >
            <span
              className={cn(
                "w-8 shrink-0 text-center font-heading text-xl md:text-2xl font-black italic tabular-nums sm:w-10 drop-shadow-md",
                podiumRankClass(row.rank),
              )}
            >
              {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.avatar_url}
              alt=""
              className={cn(
                "size-12 shrink-0 rounded-full object-cover ring-2 sm:size-14 shadow-md",
                row.rank <= 3 ? "ring-white/80" : "ring-border"
              )}
            />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate font-bold text-lg", isViewer && "text-primary drop-shadow-[0_0_8px_rgba(250,115,22,0.6)]")}>
                {row.display_name}
                {isViewer ? <span className="ml-2 text-xs uppercase tracking-widest text-primary font-black opacity-80">(YOU)</span> : null}
              </p>
            </div>
            <span className="shrink-0 font-heading text-2xl font-black tabular-nums text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary/60 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
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
      <h1 className="font-heading text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-foreground to-primary/80 drop-shadow-[0_5px_15px_rgba(250,115,22,0.4)] px-1 uppercase italic mb-8">
        Leaderboard
      </h1>

      <div className="glass-card mb-8 overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        <div className="px-6 py-5 border-b border-border/40 bg-surface/30">
          <h2 className="text-2xl font-black tracking-widest text-primary drop-shadow-[0_0_10px_rgba(250,115,22,0.5)] uppercase flex items-center gap-3">
            <span className="text-3xl animate-bounce">🏆</span> Points
          </h2>
        </div>
        <div className="p-4 sm:p-6 bg-gradient-to-b from-primary/5 to-transparent">
          <LeaderboardTable rows={data.points} viewerId={data.viewer_id} valueKey="score" />
        </div>
      </div>

      <div className="glass-card mb-8 overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
        <div className="px-6 py-5 border-b border-border/40 bg-surface/30">
          <h2 className="text-2xl font-black tracking-widest text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] uppercase flex items-center gap-3">
            <span className="text-3xl animate-pulse">🔥</span> Streak
          </h2>
        </div>
        <div className="p-4 sm:p-6 bg-gradient-to-b from-red-500/5 to-transparent">
          <LeaderboardTable rows={data.streaks} viewerId={data.viewer_id} valueKey="streak" />
        </div>
      </div>
    </div>
  );
}
