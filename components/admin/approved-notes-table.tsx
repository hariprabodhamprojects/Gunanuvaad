"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveDailyNoteAction, disapproveDailyNoteAction } from "@/lib/admin/actions";
import type { AdminNoteForApprovalRow } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

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
      <p className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-12 text-center text-sm text-muted-foreground">
        No notes yet, or RPC unavailable. Apply the admin migration and try again.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5 font-medium sm:px-4">Date</th>
            <th className="px-3 py-2.5 font-medium sm:px-4">From → To</th>
            <th className="px-3 py-2.5 font-medium sm:px-4">Preview</th>
            <th className="px-3 py-2.5 font-medium sm:px-4">Approved</th>
            <th className="w-36 px-3 py-2.5 font-medium sm:px-4" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.note_id} className="border-b border-border/40 last:border-0">
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs sm:px-4">{r.campaign_date}</td>
              <td className="px-3 py-2.5 sm:px-4">
                <span className="text-xs sm:text-sm">
                  {r.author_display_name}
                  <span className="text-muted-foreground"> → </span>
                  {r.recipient_display_name}
                </span>
              </td>
              <td className="max-w-xs px-3 py-2.5 text-muted-foreground sm:max-w-md sm:px-4">
                <span className="line-clamp-2">{r.body_preview}</span>
              </td>
              <td className="px-3 py-2.5 sm:px-4">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    r.is_approved ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {r.is_approved ? "Yes" : "No"}
                </span>
              </td>
              <td className="px-3 py-2.5 sm:px-4">
                {r.is_approved ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full min-w-0"
                    disabled={pending}
                    onClick={() => run(() => disapproveDailyNoteAction(r.note_id))}
                  >
                    Disapprove
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full min-w-0"
                    disabled={pending}
                    onClick={() => run(() => approveDailyNoteAction(r.note_id))}
                  >
                    Approve
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
