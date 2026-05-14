"use client";

import { Fragment, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RosterPersonDialog } from "@/components/roster/roster-person-dialog";
import { createRosterStagger } from "@/lib/motion-variants";
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
  // The whole row is one tappable surface. Tapping the avatar opens the
  // lightbox; tapping anywhere else opens the dialog. We deliberately do NOT
  // wrap each side in a separate <button> any more — nested interactive
  // elements + small hit gaps were a big part of the "I have to tap 5 times"
  // perception on iOS.
  return (
    <div
      role="button"
      tabIndex={canWrite ? 0 : -1}
      aria-disabled={!canWrite}
      aria-label={
        canWrite
          ? `Write a ghun to ${member.display_name}`
          : `${member.display_name} — invited, not joined yet`
      }
      onClick={() => {
        if (!canWrite) return;
        onSelect();
      }}
      onKeyDown={(e) => {
        if (!canWrite) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative flex w-full select-none items-stretch border-b border-border/40 outline-none",
        "transition-[background-color] duration-[140ms] ease-[var(--ease-out-standard)]",
        /* No transform here: the roster list card uses overflow-hidden for
           rounded corners; active:scale clips the top of the row on iOS. */
        "active:bg-primary/15",
        "focus-visible:bg-muted/40",
        canWrite ? "cursor-pointer" : "cursor-not-allowed opacity-60",
      )}
    >
      <div className="flex shrink-0 items-center justify-center py-2 pl-2 pr-3 sm:pr-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAvatarClick();
          }}
          className="relative size-12 overflow-hidden rounded-full shadow-sm ring-2 ring-transparent transition-[opacity,box-shadow] duration-[180ms] ease-[var(--ease-out-standard)] active:opacity-90 sm:size-14"
          aria-label={`View profile picture of ${member.display_name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={member.avatar_url} alt="" className="size-full object-cover" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-4">
        <p className="truncate text-[16px] font-semibold tracking-tight text-foreground sm:text-[17px]">
          {member.display_name}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground sm:text-[14px]">
          {canWrite ? "Tap to write a meaningful ghun." : "Invited - not joined yet."}
        </p>
      </div>
    </div>
  );
}

export function RosterPickExperience({ members, currentUserId, dailyCampaignStatus }: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<RosterMember | null>(null);
  const [zoomedAvatar, setZoomedAvatar] = useState<string | null>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const stagger = useMemo(() => createRosterStagger(reduceMotion), [reduceMotion]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = !s
      ? members
      : members.filter((m) => m.display_name.toLowerCase().includes(s));
    return [...list].sort((a, b) =>
      a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" }),
    );
  }, [members, q]);

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
          <motion.div
            className="flex w-full max-w-full flex-col overflow-x-clip rounded-3xl border border-border/50 bg-card/30 pb-24 shadow-sm"
            variants={stagger.container}
            initial="hidden"
            animate="show"
          >
            {listRows.map(({ member, firstLetter, showHeader }) => (
              <Fragment key={member.id}>
                {showHeader && (
                  <motion.div
                    className="pt-6 pb-2 px-6 sm:px-8 w-full shrink-0"
                    variants={stagger.item}
                  >
                    <span className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                      {firstLetter}
                    </span>
                  </motion.div>
                )}
                <motion.div className="w-full" variants={stagger.item}>
                  <RosterMemberCard
                    member={member}
                    onSelect={() => setSelected(member)}
                    onAvatarClick={() => setZoomedAvatar(member.avatar_url)}
                  />
                </motion.div>
              </Fragment>
            ))}
          </motion.div>
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
