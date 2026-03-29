"use client";

import gsap from "gsap";
import { Fraunces } from "next/font/google";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AuthoredDailyNote } from "@/lib/notes/get-authored-notes";
import { cn } from "@/lib/utils";

/** Display serif for recipient name — distinct from UI sans (Geist). */
const recipientDisplay = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

/** Keeps the month grid from stretching on wide viewports; cells stay tap-friendly but compact. */
const CAL_GRID_MAX = "max-w-[17.5rem] sm:max-w-[18.5rem] md:max-w-[19.5rem]";

type Props = {
  notes: AuthoredDailyNote[];
  /** YYYY-MM-DD in Asia/Kolkata — from server, matches DB campaign day */
  campaignToday: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function addMonths(year: number, month: number, delta: number): { y: number; m: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function monthPrefix(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Prefer campaign “today” in this month, else latest note on/before today, else latest in month. */
function defaultSelectedInMonth(
  year: number,
  month: number,
  sortedDates: string[],
  campaignToday: string,
): string {
  const p = monthPrefix(year, month);
  const inMonth = sortDatesAsc(sortedDates.filter((d) => d.startsWith(`${p}-`)));
  if (inMonth.length === 0) return "";
  if (inMonth.includes(campaignToday)) return campaignToday;
  const onOrBefore = inMonth.filter((d) => d <= campaignToday);
  if (onOrBefore.length) return onOrBefore[onOrBefore.length - 1];
  return inMonth[inMonth.length - 1];
}

/** Chronological sort for YYYY-MM-DD strings */
function sortDatesAsc(dates: string[]): string[] {
  return [...dates].sort((a, b) => a.localeCompare(b));
}

function buildInitialCal(
  notes: AuthoredDailyNote[],
  campaignToday: string,
): { year: number; month: number; selectedDate: string } {
  const sorted = sortDatesAsc([...new Set(notes.map((n) => n.campaign_date))]);
  if (sorted.length === 0) {
    const y = Number(campaignToday.slice(0, 4));
    const m = Number(campaignToday.slice(5, 7));
    return { year: y, month: m, selectedDate: "" };
  }
  let selected: string;
  if (sorted.includes(campaignToday)) {
    selected = campaignToday;
  } else {
    const onOrBefore = sorted.filter((d) => d <= campaignToday);
    selected = onOrBefore.length ? onOrBefore[onOrBefore.length - 1] : sorted[sorted.length - 1];
  }
  return {
    year: Number(selected.slice(0, 4)),
    month: Number(selected.slice(5, 7)),
    selectedDate: selected,
  };
}

function formatLongDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function NoteRecipientCard({ note }: { note: AuthoredDailyNote }) {
  const innerRef = useRef<HTMLDivElement>(null);

  const onEnter = () => {
    const el = innerRef.current;
    if (!el) return;
    gsap.to(el, { scale: 1.008, y: -2, duration: 0.25, ease: "power2.out", overwrite: "auto" });
  };
  const onLeave = () => {
    const el = innerRef.current;
    if (!el) return;
    gsap.to(el, { scale: 1, y: 0, duration: 0.32, ease: "power3.out", overwrite: "auto" });
  };

  const avatarSrc = note.recipient_avatar_url?.trim() || "/globe.svg";

  return (
    <div className="mx-auto w-full max-w-md" onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <Card
        size="sm"
        className={cn(
          "gap-0 overflow-hidden border-0 p-0 py-0 shadow-lg ring-0",
          "transition-shadow duration-300 hover:shadow-xl hover:ring-0",
        )}
      >
        <div ref={innerRef} className="flex flex-col will-change-transform">
          <div className="relative h-40 w-full shrink-0 overflow-hidden bg-muted/50 sm:h-44 md:h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt=""
              className="size-full object-cover object-[center_15%]"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent"
              aria-hidden
            />
          </div>
          <CardContent className="flex flex-col gap-2 px-4 pb-2 pt-3 sm:gap-2.5 sm:px-5 sm:pb-3 sm:pt-4">
            <div className="text-center">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-[0.7rem]">
                Written for
              </p>
              <p
                className={cn(
                  recipientDisplay.className,
                  "mt-1.5 line-clamp-2 text-pretty text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl md:text-[1.65rem]",
                )}
              >
                {note.recipient_name}
              </p>
            </div>
          </CardContent>
          <div className="border-t border-border/50 bg-muted/20 px-4 py-4 sm:px-5 sm:py-5">
            <p className="whitespace-pre-wrap text-pretty font-sans text-base leading-[1.65] text-foreground sm:text-lg sm:leading-relaxed md:text-xl md:leading-[1.7]">
              {note.body}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function NotesCalendarSection({ notes, campaignToday }: Props) {
  const sortedDates = useMemo(() => sortDatesAsc([...new Set(notes.map((n) => n.campaign_date))]), [notes]);

  const [cal, setCal] = useState(() => buildInitialCal(notes, campaignToday));

  const calendarRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const noteDates = useMemo(() => new Set(notes.map((n) => n.campaign_date)), [notes]);

  const selectedDate = cal.selectedDate;
  const notesForDate = useMemo(
    () => notes.filter((note) => note.campaign_date === selectedDate),
    [notes, selectedDate],
  );

  const goMonth = (delta: number) => {
    setCal((c) => {
      const { y, m } = addMonths(c.year, c.month, delta);
      const prefix = monthPrefix(y, m);
      let nextSelected = c.selectedDate;
      if (!nextSelected || !nextSelected.startsWith(`${prefix}-`)) {
        nextSelected = defaultSelectedInMonth(y, m, sortedDates, campaignToday);
      }
      return { year: y, month: m, selectedDate: nextSelected };
    });
  };

  useLayoutEffect(() => {
    const el = calendarRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0.65, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out", overwrite: "auto" },
      );
    }, el);
    return () => ctx.revert();
  }, [cal.year, cal.month]);

  useLayoutEffect(() => {
    const el = detailRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", overwrite: "auto" },
      );
    }, el);
    return () => ctx.revert();
  }, [selectedDate, notesForDate.length]);

  const year = cal.year;
  const month = cal.month;
  const dim = daysInMonth(year, month);
  const startPad = new Date(year, month - 1, 1).getDay();
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const cells: { key: string; day: number | null; dateKey: string | null }[] = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ key: `pad-s-${i}`, day: null, dateKey: null });
  }
  for (let d = 1; d <= dim; d++) {
    const dateKey = ymd(year, month, d);
    cells.push({ key: dateKey, day: d, dateKey });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `pad-e-${cells.length}`, day: null, dateKey: null });
  }

  const hasAnyNotes = notes.length > 0;

  return (
    <div className="space-y-6">
      <Card className="mx-auto w-full max-w-md overflow-hidden border-border/80 shadow-sm ring-1 ring-border/40 md:max-w-lg">
        <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-base font-semibold tracking-tight sm:text-lg md:text-xl">
              {monthLabel}
            </h2>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-xl"
                aria-label="Previous month"
                onClick={() => goMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-xl"
                aria-label="Next month"
                onClick={() => goMonth(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div ref={calendarRef} className={cn("mx-auto select-none", CAL_GRID_MAX)}>
            <div className="mb-1.5 grid grid-cols-7 gap-0 text-center">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="flex h-7 items-center justify-center text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground sm:h-8 sm:text-[0.65rem]"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1.5">
              {cells.map((cell) => {
                if (cell.day === null || !cell.dateKey) {
                  return (
                    <div key={cell.key} className="flex h-9 justify-center sm:h-10">
                      <span className="size-9 sm:size-10" aria-hidden />
                    </div>
                  );
                }
                const hasNote = noteDates.has(cell.dateKey);
                const isSelected = selectedDate === cell.dateKey;
                const isCampaignToday = cell.dateKey === campaignToday;
                return (
                  <div key={cell.key} className="flex h-9 justify-center sm:h-10">
                    <button
                      type="button"
                      disabled={!hasNote}
                      onClick={() => setCal((c) => ({ ...c, selectedDate: cell.dateKey! }))}
                      aria-pressed={isSelected}
                      aria-current={isCampaignToday ? "date" : undefined}
                      className={cn(
                        "relative flex size-9 items-center justify-center rounded-lg text-[0.8125rem] font-semibold tabular-nums transition-[color,background-color,box-shadow] sm:size-10 sm:text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        !hasNote && "cursor-default text-muted-foreground/30",
                        !hasNote && isCampaignToday && "ring-1 ring-dashed ring-primary/35 text-muted-foreground/45",
                        hasNote && !isSelected && "bg-muted/50 text-foreground hover:bg-muted/80",
                        hasNote &&
                          !isSelected &&
                          isCampaignToday &&
                          "ring-1 ring-primary/40 ring-offset-0",
                        hasNote &&
                          isSelected &&
                          "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/25 ring-offset-2 ring-offset-card",
                      )}
                    >
                      {cell.day}
                      {hasNote && !isSelected ? (
                        <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary/65" />
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={detailRef} className="min-h-[12rem]">
        {!hasAnyNotes ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-14 text-center text-sm text-muted-foreground">
            You have not written any notes yet.
          </p>
        ) : !selectedDate ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-14 text-center text-sm text-muted-foreground">
            No notes in this month. Try another month.
          </p>
        ) : notesForDate.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-14 text-center text-sm text-muted-foreground">
            No note for {formatLongDate(selectedDate)}.
          </p>
        ) : (
          <div className="space-y-4">
            {notesForDate.map((note) => (
              <NoteRecipientCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
