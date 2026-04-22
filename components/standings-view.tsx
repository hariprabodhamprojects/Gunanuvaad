"use client";

import { useState } from "react";
import { StandingsEntry, StandingsPayload } from "@/lib/standings/types";
import { useRealtimeRefresh } from "@/lib/supabase/use-realtime-refresh";
import { cn } from "@/lib/utils";

function ListEntry({ 
  row, 
  viewerId, 
  valueKey,
  stickerType 
}: { 
  row: StandingsEntry; 
  viewerId: string; 
  valueKey: "score" | "streak";
  stickerType: "gold" | "silver" | "bronze" | "wooden"
}) {
  const isViewer = row.id === viewerId;
  const val = valueKey === "score" ? row.score ?? 0 : row.streak ?? 0;

  let stickerStyles = "";
  switch(stickerType) {
    case "gold":
      stickerStyles = "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 ring-2 ring-amber-400/50 shadow-md shadow-amber-500/20";
      break;
    case "silver":
      stickerStyles = "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 ring-2 ring-slate-300/50 shadow-md shadow-slate-400/20";
      break;
    case "bronze":
      stickerStyles = "bg-gradient-to-br from-orange-600 to-orange-800 text-orange-50 ring-2 ring-orange-700/50 shadow-md shadow-orange-800/20 dark:from-orange-700 dark:to-orange-900";
      break;
    case "wooden":
      stickerStyles = "bg-gradient-to-br from-stone-400 to-stone-600 text-stone-50 ring-1 ring-stone-400/30 shadow-sm dark:from-stone-600 dark:to-stone-800";
      break;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 sm:gap-4 py-3 px-3 sm:px-4 rounded-[1.25rem] transition-all duration-300 my-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-border/50",
        isViewer ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/40 bg-card"
      )}
    >
      <div className={cn("size-8 sm:size-10 shrink-0 flex items-center justify-center rounded-full font-bold text-sm sm:text-base tracking-tighter", stickerStyles)}>
        #{row.rank}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={row.avatar_url}
        alt=""
        className="size-10 sm:size-12 object-cover rounded-full ring-2 ring-border shadow-sm"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm sm:text-base font-semibold", isViewer && "text-primary")}>
          {row.display_name}
          {isViewer && <span className="ml-2 text-[10px] uppercase font-bold tracking-widest opacity-60">(You)</span>}
        </p>
      </div>
      <span className="shrink-0 text-lg font-bold tabular-nums text-foreground">
        {val}
      </span>
    </div>
  );
}

export function StandingsView({ data }: { data: StandingsPayload }) {
  const [tab, setTab] = useState<"score" | "streak">("score");

  // Live-update points/streaks whenever anything that feeds the scoring
  // formula changes. The current `standings_leaderboards()` RPC (see
  // `supabase/migrations/20260418120000_swadhyay_weekly_redesign.sql`) reads
  // from three sources:
  //   1. `daily_notes`          — one row = +2 points (INSERT only; notes
  //                                are append-only for members).
  //   2. `swadhyay_posts`       — non-revoked post on an active published
  //                                topic = +2 points per unique campaign
  //                                date. Revoke flips `is_revoked` via
  //                                UPDATE, so we need UPDATE *and* INSERT
  //                                *and* DELETE here (DELETE is admin-only
  //                                today, but covering it is free).
  //   3. `swadhyay_topics`      — `is_published` toggle retroactively
  //                                includes/excludes every post inside the
  //                                window. UPDATE is the only event that
  //                                matters for scoring.
  // All three tables must be in the `supabase_realtime` publication — see
  // `20260420130000_swadhyay_redesign_realtime.sql` for the redesign-era
  // repair that makes this subscription meaningful.
  useRealtimeRefresh({
    channel: "standings-live",
    subscriptions: [
      { table: "daily_notes", event: "INSERT" },
      { table: "swadhyay_posts" },
      { table: "swadhyay_topics", event: "UPDATE" },
    ],
    // Leaderboard churn is low; wait a bit longer so a burst of submissions
    // coalesces into a single re-fetch instead of one per row.
    debounceMs: 500,
    // Safety net: if websocket events are dropped in a given browser/runtime,
    // standings still self-heal without manual refresh.
    fallbackIntervalMs: 4000,
  });

  const rows = tab === "score" ? data.points : data.streaks;

  const getVal = (r: StandingsEntry) => tab === "score" ? r.score ?? 0 : r.streak ?? 0;
  
  // Extract unique sorted values descending
  const uniqueVals = Array.from(new Set(rows.map(getVal))).sort((a, b) => b - a);

  const getStickerType = (val: number) => {
    const idx = uniqueVals.indexOf(val);
    if (idx === 0) return "gold";
    if (idx === 1) return "silver";
    if (idx === 2) return "bronze";
    return "wooden";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="page-hero rounded-3xl border border-border/60 bg-card/70 px-5 py-5 shadow-sm transition-shadow duration-[var(--motion-base)] ease-[var(--ease-out-standard)] hover:shadow-md sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary sm:text-[28px]">
            Leaderboard
          </h1>

          {/* Custom segmented control */}
          <div className="flex items-center rounded-xl border border-border bg-muted/60 p-1 shadow-inner">
            <button
              onClick={() => setTab("score")}
              className={cn(
                "w-1/2 rounded-lg px-6 py-2 text-sm font-semibold transition-colors sm:w-auto",
                tab === "score"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              By Points
            </button>
            <button
              onClick={() => setTab("streak")}
              className={cn(
                "w-1/2 rounded-lg px-6 py-2 text-sm font-semibold transition-colors sm:w-auto",
                tab === "streak"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              By Streak
            </button>
          </div>
        </div>
      </header>

      {rows.length > 0 ? (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-both px-2 sm:mt-8">
          {rows.map((r, i) => (
            <ListEntry 
              key={r.id + "-" + i} 
              row={r} 
              viewerId={data.viewer_id} 
              valueKey={tab} 
              stickerType={getStickerType(getVal(r))}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-sm font-medium text-muted-foreground border border-dashed border-border rounded-3xl mx-2">
          No data available
        </div>
      )}
    </div>
  );
}
