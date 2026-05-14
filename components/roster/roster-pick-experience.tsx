"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RosterPersonDialog } from "@/components/roster/roster-person-dialog";
import type { DailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
import { buildRosterListRows } from "@/lib/roster/build-list-rows";
import type { RosterMember } from "@/lib/roster/types";
import { cn } from "@/lib/utils";

type Props = {
  members: RosterMember[];
  currentUserId: string;
  dailyCampaignStatus: DailyCampaignStatus;
};

function RosterMemberCard({
  member,
  onSelect,
  onAvatarClick,
}: {
  member: RosterMember;
  onSelect: () => void;
  onAvatarClick: () => void;
}) {
  const canWrite = member.can_write;
  /* Two sibling <button>s — valid HTML (no button inside role="button") and
     reliable hit targets on iOS WKWebView. */
  return (
    <div className="group flex w-full items-stretch border-b border-border/40">
      <div className="flex shrink-0 items-center justify-center py-2 pl-2 pr-3 sm:pr-4">
        <button
          type="button"
          onClick={onAvatarClick}
          className="relative size-12 overflow-hidden rounded-full shadow-sm ring-2 ring-transparent transition-opacity duration-150 ease-[var(--ease-out-standard)] active:opacity-80 sm:size-14"
          aria-label={`View profile picture of ${member.display_name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={member.avatar_url} alt="" className="size-full object-cover" />
        </button>
      </div>

      <button
        type="button"
        disabled={!canWrite}
        onClick={() => {
          if (!canWrite) return;
          onSelect();
        }}
        className={cn(
          "flex min-h-[3.25rem] min-w-0 flex-1 flex-col justify-center py-3 pr-4 text-left outline-none",
          "transition-[background-color] duration-150 ease-[var(--ease-out-standard)]",
          "active:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60",
          "focus-visible:bg-muted/40",
        )}
        aria-label={
          canWrite
            ? `Write a ghun to ${member.display_name}`
            : `${member.display_name} — invited, not joined yet`
        }
      >
        <span className="block truncate text-[16px] font-semibold tracking-tight text-foreground sm:text-[17px]">
          {member.display_name}
        </span>
        <span className="mt-0.5 block line-clamp-1 text-left text-[13px] text-muted-foreground sm:text-[14px]">
          {canWrite ? "Tap to write a meaningful ghun." : "Invited - not joined yet."}
        </span>
      </button>
    </div>
  );
}

export function RosterPickExperience({ members, currentUserId, dailyCampaignStatus }: Props) {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [selected, setSelected] = useState<RosterMember | null>(null);
  const [zoomedAvatar, setZoomedAvatar] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = deferredQ.trim().toLowerCase();
    const list = !s
      ? members
      : members.filter((m) => m.display_name.toLowerCase().includes(s));
    return [...list].sort((a, b) =>
      a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" }),
    );
  }, [members, deferredQ]);

  const listRows = useMemo(() => buildRosterListRows(filtered), [filtered]);

  return (
    <>
      <div className="space-y-6">
        <div className="relative isolate z-10">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 z-0 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            enterKeyHint="search"
            autoCapitalize="words"
            autoCorrect="on"
            spellCheck
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members..."
            className="relative z-10 h-14 rounded-2xl border-border bg-card/50 pl-12 text-base shadow-sm focus-visible:ring-primary/20"
            aria-label="Search roster by name"
            autoComplete="off"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            {members.length === 0
              ? "No members to show."
              : "No matches for your search."}
          </p>
        ) : (
          <div className="flex w-full max-w-full flex-col overflow-x-clip rounded-3xl border border-border/50 bg-card/30 pb-24 shadow-sm">
            {listRows.map(({ member, firstLetter, showHeader }) => (
              <Fragment key={member.id}>
                {showHeader && (
                  <div className="w-full shrink-0 px-6 pb-2 pt-6 sm:px-8">
                    <span className="text-xl font-extrabold tracking-tight text-primary sm:text-2xl">
                      {firstLetter}
                    </span>
                  </div>
                )}
                <div className="w-full">
                  <RosterMemberCard
                    member={member}
                    onSelect={() => setSelected(member)}
                    onAvatarClick={() => setZoomedAvatar(member.avatar_url)}
                  />
                </div>
              </Fragment>
            ))}
          </div>
        )}
      </div>

      <RosterPersonDialog
        member={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        currentUserId={currentUserId}
        dailyCampaignStatus={dailyCampaignStatus}
      />

      {zoomedAvatar && (
        <div
          className="fixed inset-0 z-[100] flex animate-in items-center justify-center bg-black/80 fade-in duration-200 backdrop-blur-sm"
          onClick={() => setZoomedAvatar(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setZoomedAvatar(null);
          }}
          role="presentation"
        >
          <button
            type="button"
            onClick={() => setZoomedAvatar(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close zoomed image"
          >
            <X className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomedAvatar}
            alt="Profile zoom"
            className="max-h-[85vh] max-w-[85vw] animate-in object-contain shadow-2xl duration-200 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
