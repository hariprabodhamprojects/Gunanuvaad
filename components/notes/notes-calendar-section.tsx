"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AuthoredDailyNote } from "@/lib/notes/get-authored-notes";

type Props = {
  notes: AuthoredDailyNote[];
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  if (!y || !m || !d) return dateStr;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NotesCalendarSection({ notes }: Props) {
  const uniqueDates = useMemo(() => [...new Set(notes.map((n) => n.campaign_date))], [notes]);
  const [selectedDate, setSelectedDate] = useState(uniqueDates[0] ?? "");

  const notesForDate = useMemo(
    () => notes.filter((note) => note.campaign_date === selectedDate),
    [notes, selectedDate],
  );

  return (
    <div className="space-y-4">
      <Card className="ring-border/70">
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pick a date to see what you wrote for someone on that day.
          </p>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={uniqueDates[uniqueDates.length - 1] ?? undefined}
            max={uniqueDates[0] ?? undefined}
            className="h-11 rounded-xl border-border/80 bg-background/60"
            aria-label="Choose a campaign date"
          />
        </CardContent>
      </Card>

      {!selectedDate ? (
        <p className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          You have not written any notes yet.
        </p>
      ) : notesForDate.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          No note found for {formatDate(selectedDate)}.
        </p>
      ) : (
        <div className="space-y-3">
          {notesForDate.map((note) => (
            <Card key={note.id} className="ring-border/60">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 overflow-hidden rounded-full bg-muted/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={note.recipient_avatar_url || "/globe.svg"}
                      alt=""
                      className="size-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Written for</p>
                    <p className="font-medium">{note.recipient_name}</p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap rounded-lg bg-muted/30 px-3 py-2 text-sm">{note.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
