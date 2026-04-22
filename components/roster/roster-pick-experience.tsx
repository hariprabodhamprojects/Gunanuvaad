"use client";

import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RosterPersonDialog } from "@/components/roster/roster-person-dialog";
import type { DailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
import { buildRosterListRows } from "@/lib/roster/build-list-rows";
import type { RosterMember } from "@/lib/roster/types";

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
  return (
    <div className="group flex items-stretch w-full text-left outline-none px-2 transition-colors duration-[180ms] ease-[var(--ease-out-standard)] hover:bg-muted/30 sm:px-4">
      {/* Avatar Button */}
      <div className="py-2 pr-3 sm:pr-4 flex items-center justify-center shrink-0 pl-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!canWrite) return;
            onAvatarClick();
          }}
          className="relative size-12 overflow-hidden rounded-full ring-2 ring-transparent shadow-sm transition-[transform,box-shadow,ring-color] duration-[180ms] ease-[var(--ease-out-standard)] sm:size-14 group-hover:ring-primary/20 active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`View profile picture of ${member.display_name}`}
          disabled={!canWrite}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={member.avatar_url}
            alt=""
            className="size-full object-cover"
          />
        </button>
      </div>

      {/* Select Area Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!canWrite) return;
          onSelect();
        }}
        className="min-w-0 flex-1 border-b border-border/40 py-3 pr-2 text-left outline-none transition-[transform,opacity] duration-[140ms] ease-[var(--ease-out-standard)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={!canWrite}
      >
        <div className="flex flex-col">
          <p className="truncate text-[16px] sm:text-[17px] font-semibold text-foreground tracking-tight">
            {member.display_name}
          </p>
          <p className="text-[13px] sm:text-[14px] text-muted-foreground mt-0.5 line-clamp-1">
            {canWrite
              ? "Tap to write a meaningful ghun."
              : "Invited - not joined yet."}
          </p>
        </div>
      </button>
    </div>
  );
}

export function RosterPickExperience({ members, currentUserId, dailyCampaignStatus }: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<RosterMember | null>(null);
  const [zoomedAvatar, setZoomedAvatar] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = !s
      ? members
      : members.filter((m) => m.display_name.toLowerCase().includes(s));
    return [...list].sort((a, b) =>
      a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" }),
    );
  }, [members, q]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = list.children;
    if (items.length === 0) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.22,
          stagger: { each: 0.02, from: "start" },
          ease: "power3.out",
          overwrite: "auto",
        },
      );
    }, list);
    return () => ctx.revert();
  }, [filtered]);

  // Build list rows with deterministic dictionary headers.
  const listRows = useMemo(() => buildRosterListRows(filtered), [filtered]);

  return (
    <>
      <div className="space-y-6">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members..."
            className="h-14 rounded-2xl border-border bg-card/50 pl-12 text-base shadow-sm focus-visible:ring-primary/20 transition-all font-medium"
            aria-label="Search roster by name"
          />
        </div>
        
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            {members.length === 0
              ? "No members to show."
              : "No matches for your search."}
          </p>
        ) : (
          <div
            ref={listRef}
            className="flex flex-col pb-24 w-full bg-card/30 rounded-3xl overflow-hidden border border-border/50 shadow-sm"
          >
            {listRows.map(({ member, firstLetter, showHeader }) => (
              <Fragment key={member.id}>
                {showHeader && (
                  <div className="pt-6 pb-2 px-6 sm:px-8 w-full shrink-0">
                    <span className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                      {firstLetter}
                    </span>
                  </div>
                )}
                <RosterMemberCard
                  member={member}
                  onSelect={() => setSelected(member)}
                  onAvatarClick={() => setZoomedAvatar(member.avatar_url)}
                />
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Roster Pick Dialog */}
      <RosterPersonDialog
        member={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        currentUserId={currentUserId}
        dailyCampaignStatus={dailyCampaignStatus}
      />

      {/* Lightweight Avatar Lightbox */}
      {zoomedAvatar && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setZoomedAvatar(null)}
        >
          <button 
            type="button"
            onClick={() => setZoomedAvatar(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            aria-label="Close zoomed image"
          >
            <X className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={zoomedAvatar} 
            alt="Profile zoom" 
            className="max-w-[85vw] max-h-[85vh] object-contain shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
}
