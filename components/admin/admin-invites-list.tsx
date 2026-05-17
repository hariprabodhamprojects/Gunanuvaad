"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { AdminInviteDeleteButton } from "@/components/admin/admin-invite-delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  inviteRowLabel,
  inviteRowMatchesQuery,
  sortInviteRows,
} from "@/lib/admin/invite-display";
import type { AdminAllowlistRow } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const DROPDOWN_MAX = 12;

type Props = {
  rows: AdminAllowlistRow[];
};

export function AdminInvitesList({ rows }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const sortedRows = useMemo(() => sortInviteRows(rows), [rows]);

  const filteredRows = useMemo(() => {
    const s = deferredQuery.trim();
    if (!s) return sortedRows;
    return sortedRows.filter((r) => inviteRowMatchesQuery(r, s));
  }, [sortedRows, deferredQuery]);

  const dropdownMatches = useMemo(() => {
    const s = deferredQuery.trim();
    if (!s) return [];
    return filteredRows.slice(0, DROPDOWN_MAX);
  }, [filteredRows, deferredQuery]);

  const showDropdown = open && deferredQuery.trim().length > 0;

  useEffect(() => {
    if (!showDropdown) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showDropdown]);

  const selectRow = (row: AdminAllowlistRow) => {
    setQuery(inviteRowLabel(row));
    setOpen(false);
    requestAnimationFrame(() => {
      document
        .getElementById(`invite-row-${encodeURIComponent(row.email)}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };

  return (
    <div className="space-y-4">
      <div ref={rootRef} className="relative max-w-xl">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 z-0 size-4 -translate-y-1/2 text-muted-foreground sm:left-4 sm:size-5"
          aria-hidden
        />
        <Input
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? `${listId}-suggestions` : undefined}
          aria-autocomplete="list"
          enterKeyHint="search"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Search by name or email…"
          className="relative z-10 h-11 rounded-xl border-border/70 bg-card pl-10 text-sm shadow-sm focus-visible:ring-primary/25 sm:h-12 sm:pl-11 sm:text-base"
          aria-label="Search invites by name or email"
          autoComplete="off"
        />

        {showDropdown ? (
          <ul
            id={`${listId}-suggestions`}
            role="listbox"
            className={cn(
              "absolute inset-x-0 top-[calc(100%+0.35rem)] z-20 max-h-72 overflow-y-auto rounded-xl border border-border/70",
              "bg-card py-1 shadow-lg ring-1 ring-black/5",
            )}
          >
            {dropdownMatches.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted-foreground">No matches.</li>
            ) : (
              dropdownMatches.map((row) => {
                const label = inviteRowLabel(row);
                return (
                  <li key={row.email} role="presentation">
                    <button
                      type="button"
                      role="option"
                      className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 active:bg-muted"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectRow(row)}
                    >
                      <span className="truncate font-medium text-foreground">{label}</span>
                      <span className="truncate font-mono text-xs text-muted-foreground">{row.email}</span>
                    </button>
                  </li>
                );
              })
            )}
            {filteredRows.length > DROPDOWN_MAX ? (
              <li className="border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
                +{filteredRows.length - DROPDOWN_MAX} more in the table below
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {deferredQuery.trim() ? (
        <p className="text-sm text-muted-foreground">
          {filteredRows.length === 0
            ? "No invites match your search."
            : `${filteredRows.length} invite${filteredRows.length === 1 ? "" : "s"} matching “${deferredQuery.trim()}”`}
        </p>
      ) : null}

      <Card className="overflow-hidden ring-border/60">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">All invites</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium sm:px-4">Email</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Invite name</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Status</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Profile</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Org</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No rows returned. Run the new admin migration and ensure you are an organizer.
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No matches for your search.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr
                      key={r.email}
                      id={`invite-row-${encodeURIComponent(r.email)}`}
                      className="border-b border-border/40 scroll-mt-24 last:border-0"
                    >
                      <td className="px-3 py-2.5 font-mono text-xs sm:px-4 sm:text-sm">{r.email}</td>
                      <td className="max-w-[10rem] truncate px-3 py-2.5 text-muted-foreground sm:px-4">
                        {r.invite_display_name?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            r.has_signed_up
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {r.has_signed_up ? "Signed up" : "Not yet"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            r.roster_ready
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {r.roster_ready ? "Roster-ready" : "Incomplete"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        {r.is_organizer ? (
                          <span className="text-xs font-medium text-primary">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <AdminInviteDeleteButton email={r.email} isOrganizer={r.is_organizer} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
