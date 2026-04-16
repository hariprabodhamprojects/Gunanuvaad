"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { approveDailyNoteAction, disapproveDailyNoteAction } from "@/lib/admin/actions";
import type { AdminNoteForApprovalRow } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";

type Props = {
  rows: AdminNoteForApprovalRow[];
};

type SortKey = "date" | "author" | "recipient" | "status";
type FilterStatus = "all" | "pending" | "approved";

export function ApprovedNotesTable({ rows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterDate, setFilterDate] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);

  const run = (noteId: string, fn: () => Promise<{ ok: boolean }>) => {
    setLoadingId(noteId);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      setLoadingId(null);
    });
  };

  const uniqueDates = useMemo(() => {
    const dates = [...new Set(rows.map((r) => r.campaign_date))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    return dates;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        if (filterStatus === "pending" && r.is_approved) return false;
        if (filterStatus === "approved" && !r.is_approved) return false;
        if (filterDate !== "all" && r.campaign_date !== filterDate) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "date") cmp = new Date(a.campaign_date).getTime() - new Date(b.campaign_date).getTime();
        else if (sortKey === "author") cmp = a.author_display_name.localeCompare(b.author_display_name);
        else if (sortKey === "recipient") cmp = a.recipient_display_name.localeCompare(b.recipient_display_name);
        else if (sortKey === "status") cmp = Number(a.is_approved) - Number(b.is_approved);
        return sortAsc ? cmp : -cmp;
      });
  }, [rows, filterStatus, filterDate, sortKey, sortAsc]);

  const pendingCount = rows.filter((r) => !r.is_approved).length;
  const approvedCount = rows.filter((r) => r.is_approved).length;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortAsc ? <ChevronUp className="size-3 ml-0.5 inline" /> : <ChevronDown className="size-3 ml-0.5 inline" />
    ) : (
      <ChevronDown className="size-3 ml-0.5 inline opacity-30" />
    );

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/15 px-4 py-16 text-center text-muted-foreground gap-4">
        <MessageSquare className="size-10 opacity-40" />
        <p className="text-sm px-4">No notes yet. Wait for members to submit!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-10">

      {/* Summary pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-[12px] font-bold text-orange-600 border border-orange-500/20 dark:text-orange-400">
          <AlertCircle className="size-3.5" />
          {pendingCount} pending
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[12px] font-bold text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          {approvedCount} approved
        </span>
        <span className="ml-auto text-[12px] text-muted-foreground">
          {filtered.length} of {rows.length} shown
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="size-3.5 text-muted-foreground shrink-0" />

        {/* Status filter */}
        <div className="flex rounded-lg border border-border/60 overflow-hidden text-[12px] font-semibold">
          {(["all", "pending", "approved"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1.5 capitalize transition-colors",
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted/50"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <select
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-[12px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="all">All dates</option>
          {uniqueDates.map((d) => (
            <option key={d} value={d}>
              {new Date(d).toLocaleDateString(undefined, {
                weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
              })}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th
                  className="px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  onClick={() => toggleSort("date")}
                >
                  Date <SortIcon k="date" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  onClick={() => toggleSort("author")}
                >
                  From <SortIcon k="author" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  onClick={() => toggleSort("recipient")}
                >
                  To <SortIcon k="recipient" />
                </th>
                <th className="px-4 py-3 hidden md:table-cell">Preview</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  onClick={() => toggleSort("status")}
                >
                  Status <SortIcon k="status" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((r) => {
                const isLoading = loadingId === r.note_id;
                return (
                    <tr
                      key={r.note_id}
                      className={cn(
                        "transition-colors group",
                        r.is_approved ? "bg-muted/10" : "hover:bg-muted/20",
                      )}
                    >
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-muted-foreground font-medium">
                        {new Date(r.campaign_date).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", timeZone: "UTC",
                        })}
                      </td>

                      {/* From */}
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-[13px] text-foreground">
                        {r.author_display_name}
                      </td>

                      {/* To */}
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-[13px] text-primary">
                        {r.recipient_display_name}
                      </td>

                      {/* Preview — full body from API; wrap for long notes */}
                      <td className="px-4 py-3 hidden md:table-cell min-w-[12rem] max-w-[min(28rem,40vw)] align-top">
                        <p className="text-left text-[13px] text-foreground/80 italic whitespace-pre-wrap break-words leading-relaxed">
                          &ldquo;{r.body_preview}&rdquo;
                        </p>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border tracking-wider uppercase",
                            r.is_approved
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                              : "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400"
                          )}
                        >
                          {r.is_approved ? <CheckCircle2 className="size-2.5" /> : <AlertCircle className="size-2.5" />}
                          {r.is_approved ? "Approved" : "Pending"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={r.is_approved ? "outline" : "default"}
                            disabled={pending || isLoading}
                            onClick={() => run(r.note_id, () => approveDailyNoteAction(r.note_id))}
                            className={cn(
                              "h-7 rounded-lg px-3 text-[12px] font-bold",
                              !r.is_approved && "bg-gradient-to-b from-primary to-primary/80 shadow-sm hover:brightness-110"
                            )}
                          >
                            {isLoading ? "…" : r.is_approved ? "Revoke" : "Approve"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={pending || isLoading}
                            onClick={() => run(r.note_id, () => disapproveDailyNoteAction(r.note_id))}
                            className="h-7 rounded-lg px-3 text-[12px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No notes match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}