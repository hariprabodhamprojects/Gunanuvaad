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
            <div className="flex flex-col space-y-4">
              {dateRows.map((r) => (
                <div
                  key={r.note_id}
                  className={cn(
                    "flex flex-col gap-4 rounded-3xl border p-5 sm:p-6 transition-all shadow-sm",
                    r.is_approved ? "bg-muted/10 border-border/40" : "bg-card border-border/80"
                  )}
                >
                  {/* From -> To */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="font-semibold text-foreground text-[15px] sm:text-[16px]">
                      {r.author_display_name} 
                      <span className="font-medium text-muted-foreground mx-2 text-[13px] sm:text-[14px]">wrote for</span> 
                      <span className="text-primary">{r.recipient_display_name}</span>
                    </p>
                    <span
                      className={cn(
                        "inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-bold border tracking-wider uppercase",
                        r.is_approved 
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" 
                          : "bg-muted/50 text-muted-foreground border-transparent",
                      )}
                    >
                      {r.is_approved ? "Approved" : "Pending"}
                    </span>
                  </div>

                  {/* What has been written */}
                  <div className="rounded-2xl bg-muted/40 p-4 sm:p-5 border border-border/50 shadow-inner">
                    <p className="text-[15px] sm:text-[16px] font-medium text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      "{r.body_preview}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row items-center gap-3 pt-1">
                    <Button
                      type="button"
                      variant={r.is_approved ? "outline" : "secondary"}
                      className="flex-1 rounded-xl h-12 text-[14px] font-semibold border-border/60"
                      disabled={pending}
                      onClick={() => run(() => disapproveDailyNoteAction(r.note_id))}
                    >
                      {r.is_approved ? "Revoke Approval" : "Disapprove"}
                    </Button>
                    <Button
                      type="button"
                      className={cn(
                        "flex-1 rounded-xl h-12 text-[14px] font-semibold",
                        !r.is_approved && "bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-[0_4px_14px_rgba(250,115,22,0.25)] hover:brightness-110"
                      )}
                      variant={r.is_approved ? "outline" : "default"}
                      disabled={pending}
                      onClick={() => run(() => approveDailyNoteAction(r.note_id))}
                    >
                      {r.is_approved ? "Already Approved" : "Approve Note"}
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
