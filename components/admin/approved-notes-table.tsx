"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveDailyNoteAction, disapproveDailyNoteAction } from "@/lib/admin/actions";
import type { AdminNoteForApprovalRow } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, MessageSquare } from "lucide-react";

type Props = {
  rows: AdminNoteForApprovalRow[];
};

export function ApprovedNotesTable({ rows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean }>) => {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
    });
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/15 px-4 py-16 text-center text-muted-foreground gap-4">
        <MessageSquare className="size-10 opacity-40" />
        <p className="text-sm px-4">
          No notes yet, or RPC unavailable. Wait for members to submit notes!
        </p>
      </div>
    );
  }

  // Group by date
  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.campaign_date]) acc[row.campaign_date] = [];
    acc[row.campaign_date].push(row);
    return acc;
  }, {} as Record<string, AdminNoteForApprovalRow[]>);

  // Sort dates descending
  const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="flex flex-col space-y-10 pb-16">
      {dates.map((date) => {
        const dateRows = grouped[date];
        const unapprovedCount = dateRows.filter((r) => !r.is_approved).length;

        // Make date look extremely highlighted (e.g. Wednesday, May 15)
        // using native format if possible, otherwise rely on the string natively.
        const niceDate = new Date(date).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          timeZone: "UTC"
        });

        return (
          <div key={date} className="flex flex-col space-y-5 animate-in fade-in duration-500">
            {/* Header for the Date */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-primary tracking-tight">
                {niceDate === "Invalid Date" ? date : niceDate}
              </h2>
              {unapprovedCount > 0 ? (
                <span className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3.5 py-1.5 text-[13px] font-bold text-orange-600 border border-orange-500/20 dark:text-orange-400">
                  <AlertCircle className="size-4" />
                  {unapprovedCount} request{unapprovedCount !== 1 ? "s" : ""} remaining
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-[13px] font-bold text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  All reviewed
                </span>
              )}
            </div>

            {/* List of Notes for the Date */}
            <div className="flex flex-col divide-y divide-border/50 border border-border/60 rounded-[1.5rem] bg-card overflow-hidden shadow-sm">
              {dateRows.map((r) => (
                <div
                  key={r.note_id}
                  className={cn(
                    "flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 p-4 sm:p-5 transition-colors",
                    r.is_approved ? "bg-muted/10" : "hover:bg-muted/30"
                  )}
                >
                  {/* From -> To Segment */}
                  <div className="flex flex-col w-full md:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-border/40 pb-3 md:pb-0 md:pr-4">
                    <span
                      className={cn(
                        "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold border tracking-wider uppercase mb-2",
                        r.is_approved 
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" 
                          : "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
                      )}
                    >
                      {r.is_approved ? "Approved" : "Pending Action"}
                    </span>
                    <p className="font-bold text-foreground text-[14px] sm:text-[15px] leading-tight">
                      {r.author_display_name} 
                    </p>
                    <p className="font-medium text-muted-foreground text-[12px] sm:text-[13px] mt-1">
                      wrote for <span className="text-primary font-semibold">{r.recipient_display_name}</span>
                    </p>
                  </div>

                  {/* Body Text Segment */}
                  <div className="flex-1 w-full min-w-0 py-1 md:py-0">
                    <p className="text-[14px] sm:text-[15px] font-medium text-foreground/90 whitespace-pre-wrap leading-relaxed md:px-2 italic">
                      "{r.body_preview}"
                    </p>
                  </div>

                  {/* Action Buttons Segment */}
                  <div className="flex flex-row md:flex-col items-center gap-2 shrink-0 w-full md:w-[140px] pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-border/40 md:pl-4">
                    <Button
                      type="button"
                      className={cn(
                        "flex-1 md:w-full rounded-xl h-10 text-[13px] font-bold transition-all",
                        !r.is_approved && "bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-sm hover:brightness-110"
                      )}
                      variant={r.is_approved ? "outline" : "default"}
                      disabled={pending}
                      onClick={() => run(() => approveDailyNoteAction(r.note_id))}
                    >
                      {r.is_approved ? "Revoke" : "Approve"}
                    </Button>
                    <Button
                      type="button"
                      variant={r.is_approved ? "ghost" : "secondary"}
                      className="flex-1 md:w-full rounded-xl h-10 text-[13px] font-bold border-border/60 hover:bg-muted/60"
                      disabled={pending}
                      onClick={() => run(() => disapproveDailyNoteAction(r.note_id))}
                    >
                      Disapprove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
