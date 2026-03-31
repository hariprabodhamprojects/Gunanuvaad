"use client";

import { useState } from "react";
import { StandingsEntry, StandingsPayload } from "@/lib/standings/types";
import { cn } from "@/lib/utils";

function Podium({
  entries,
  viewerId,
  valueKey,
}: {
  entries: StandingsEntry[];
  viewerId: string;
  valueKey: "score" | "streak";
}) {
  const rank1 = entries.find((e) => e.rank === 1);
  const rank2 = entries.find((e) => e.rank === 2);
  const rank3 = entries.find((e) => e.rank === 3);

  const getPodiumClasses = (rank: number) => {
    switch(rank) {
      case 1: return { color: "ring-amber-400/80 bg-gradient-to-t from-amber-500/20 to-amber-500/5", tag: "bg-amber-400 text-amber-950", h: "h-40 sm:h-48", size: "size-20 sm:size-24" };
      case 2: return { color: "ring-slate-300/80 bg-gradient-to-t from-slate-400/20 to-slate-400/5", tag: "bg-slate-300 text-slate-900", h: "h-32 sm:h-40", size: "size-16 sm:size-20" };
      case 3: return { color: "ring-orange-700/80 bg-gradient-to-t from-orange-800/20 to-orange-800/5 dark:ring-orange-800/80 dark:bg-gradient-to-t dark:from-orange-800/40 dark:to-orange-800/10", tag: "bg-orange-700 text-orange-50 dark:bg-orange-800", h: "h-28 sm:h-32", size: "size-14 sm:size-16" };
      default: return { color: "", tag: "", h: "", size: "" };
    }
  }

  const renderSlot = (record?: StandingsEntry) => {
    if (!record) {
      return <div className="flex-1 flex flex-col justify-end items-center opacity-0"><div className="w-full h-8" /></div>;
    }
    const val = valueKey === "score" ? record.score ?? 0 : record.streak ?? 0;
    const isViewer = record.id === viewerId;
    const style = getPodiumClasses(record.rank);

    return (
      <div className="flex flex-1 flex-col items-center justify-end">
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both" style={{ animationDelay: `${(record.rank - 1) * 150}ms` }}>
          <div className="relative mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.avatar_url}
              alt=""
              className={cn("rounded-full ring-[3px] shadow-lg object-cover transition-transform hover:scale-105 bg-background", style.color.split(" ")[0], style.size)}
            />
            <div className={cn("absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-bold shadow-sm whitespace-nowrap tracking-wider", style.tag)}>
              #{record.rank}
            </div>
          </div>
          <p className={cn("truncate max-w-[80px] sm:max-w-[100px] text-[11px] sm:text-sm font-bold", isViewer ? "text-primary" : "text-foreground")}>
            {record.display_name}
          </p>
          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mt-0.5 uppercase tracking-wide">
            {val} {valueKey}
          </p>
        </div>
        
        {/* Simple elegant pedestal bar */}
        <div className={cn("w-full max-w-[90px] mt-4 rounded-t-2xl flex items-end justify-center pb-3 border-t border-x border-border/50", style.color.split(" ").slice(1).join(" "), style.h)}>
          <span className="opacity-20 text-4xl font-extrabold tracking-tighter" style={{WebkitTextStroke: "1px currentColor", color: "transparent"}}>{record.rank}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 lg:gap-8 pt-4 px-2 h-[260px] sm:h-[320px]">
      {renderSlot(rank2)}
      {renderSlot(rank1)}
      {renderSlot(rank3)}
    </div>
  );
}

function ListEntry({ row, viewerId, valueKey }: { row: StandingsEntry; viewerId: string; valueKey: "score" | "streak" }) {
  const isViewer = row.id === viewerId;
  const val = valueKey === "score" ? row.score ?? 0 : row.streak ?? 0;

  return (
    <div
      className={cn(
        "flex items-center gap-4 py-3 px-4 rounded-[1.25rem] transition-all duration-300 my-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-border/50",
        isViewer ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/40 bg-card"
      )}
    >
      <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground/70">
        {row.rank}
      </span>
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

  const rows = tab === "score" ? data.points : data.streaks;
  const top3 = rows.filter(r => r.rank <= 3);
  const rest = rows.filter(r => r.rank > 3);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 px-2">
        <h1 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">
          Leaderboard
        </h1>
        
        {/* Custom Segmented Control for Tabs */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border shadow-inner">
          <button
            onClick={() => setTab("score")}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-semibold transition-all w-1/2 sm:w-auto",
              tab === "score" 
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            By Points
          </button>
          <button
            onClick={() => setTab("streak")}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-semibold transition-all w-1/2 sm:w-auto",
              tab === "streak" 
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            By Streak
          </button>
        </div>
      </div>

      <div className="relative pt-8 mb-6">
        {top3.length > 0 ? (
          <Podium entries={top3} viewerId={data.viewer_id} valueKey={tab} />
        ) : (
          <div className="py-20 text-center text-sm font-medium text-muted-foreground border border-dashed border-border rounded-3xl">No data available</div>
        )}
      </div>

      {rest.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 delay-300 fill-mode-both px-2 sm:mt-8">
          {rest.map((r) => (
            <ListEntry key={r.id} row={r} viewerId={data.viewer_id} valueKey={tab} />
          ))}
        </div>
      )}
    </div>
  );
}
