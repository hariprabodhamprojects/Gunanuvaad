"use client";

import gsap from "gsap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AuthoredDailyNote } from "@/lib/notes/get-authored-notes";
import { cn } from "@/lib/utils";

type Props = {
  notes: AuthoredDailyNote[];
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

function firstNoteDateInMonth(year: number, month: number, sortedDates: string[]): string {
  const p = monthPrefix(year, month);
  const inMonth = sortedDates.filter((d) => d.startsWith(`${p}-`));
  return inMonth.length ? inMonth[inMonth.length - 1] : "";
}

/** Chronological sort for YYYY-MM-DD strings */
function sortDatesAsc(dates: string[]): string[] {
  return [...dates].sort((a, b) => a.localeCompare(b));
}

function buildInitialCal(notes: AuthoredDailyNote[]): { year: number; month: number; selectedDate: string } {
  const sorted = sortDatesAsc([...new Set(notes.map((n) => n.campaign_date))]);
  const last = sorted[sorted.length - 1];
  if (!last) {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() + 1, selectedDate: "" };
  }
  return {
    year: Number(last.slice(0, 4)),
    month: Number(last.slice(5, 7)),
    selectedDate: last,
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

function NoteRecipientCard({ note, formattedDate }: { note: AuthoredDailyNote; formattedDate: string }) {
  const innerRef = useRef<HTMLDivElement>(null);

  const onEnter = () => {
    const el = innerRef.current;
    if (!el) return;
    gsap.to(el, { scale: 1.01, y: -2, duration: 0.25, ease: "power2.out", overwrite: "auto" });
  };
  const onLeave = () => {
    const el = innerRef.current;
    if (!el) return;
    gsap.to(el, { scale: 1, y: 0, duration: 0.32, ease: "power3.out", overwrite: "auto" });
  };

  const avatarSrc = note.recipient_avatar_url?.trim() || "/globe.svg";

  return (
    <div className="mx-auto w-full max-w-sm" onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <Card
        size="sm"
        className={cn(
          "gap-0 overflow-hidden p-0 py-0 shadow-md ring-border/60",
          "transition-shadow duration-300 hover:shadow-lg hover:ring-primary/20",
        )}
      >
        <div ref={innerRef} className="flex flex-col will-change-transform">
          <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc} alt="" className="size-full object-cover" />
          </div>
          <CardContent className="flex flex-col gap-1 px-3 py-3 sm:px-3.5 sm:py-3.5">
            <p className="text-center text-xs font-medium text-muted-foreground">Written for</p>
            <p className="line-clamp-2 text-center font-heading text-sm font-semibold leading-snug text-foreground sm:text-base">
              {note.recipient_name}
            </p>
            <p className="text-center text-xs text-muted-foreground">{formattedDate}</p>
          </CardContent>
          <div className="border-t border-border/60 bg-muted/15 px-3 py-3 sm:px-4 sm:py-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{note.body}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function NotesCalendarSection({ notes }: Props) {
  const sortedDates = useMemo(() => sortDatesAsc([...new Set(notes.map((n) => n.campaign_date))]), [notes]);

  const [cal, setCal] = useState(() => buildInitialCal(notes));

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
        nextSelected = firstNoteDateInMonth(y, m, sortedDates);
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
      <Card className="overflow-hidden border-border/80 shadow-sm ring-1 ring-border/40">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight sm:text-xl">{monthLabel}</h2>
            <div className="flex items-center gap-1">
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

          <div ref={calendarRef} className="select-none">
            <div className="mb-2 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="py-1 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {cells.map((cell) => {
                if (cell.day === null || !cell.dateKey) {
                  return <div key={cell.key} className="aspect-square min-h-[2.5rem] sm:min-h-10" />;
                }
                const hasNote = noteDates.has(cell.dateKey);
                const isSelected = selectedDate === cell.dateKey;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!hasNote}
                    onClick={() => setCal((c) => ({ ...c, selectedDate: cell.dateKey! }))}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative flex aspect-square min-h-[2.5rem] items-center justify-center rounded-xl text-sm font-medium transition-colors sm:min-h-10 sm:text-base",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      !hasNote && "cursor-default text-muted-foreground/35",
                      hasNote && !isSelected && "bg-muted/40 text-foreground hover:bg-muted/70",
                      hasNote &&
                        isSelected &&
                        "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                    )}
                  >
                    {cell.day}
                    {hasNote && !isSelected ? (
                      <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary/70" />
                    ) : null}
                  </button>
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
              <NoteRecipientCard key={note.id} note={note} formattedDate={formatLongDate(selectedDate)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
