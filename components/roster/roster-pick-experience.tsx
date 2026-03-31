"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RosterPersonDialog } from "@/components/roster/roster-person-dialog";
import type { DailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
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
}: {
  member: RosterMember;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col items-center justify-center gap-3 w-full text-center outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "rounded-2xl p-5 glass-card hover:bg-muted/40 transition-all duration-300 active:scale-95"
      )}
      aria-label={`Open ${member.display_name}`}
    >
      <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-full ring-2 ring-border group-hover:ring-primary/30 transition-all shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.avatar_url}
          alt=""
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <p className="truncate w-full text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
        {member.display_name}
      </p>
    </button>
  );
}

export function RosterPickExperience({ members, currentUserId, dailyCampaignStatus }: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<RosterMember | null>(null);
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
    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: { each: 0.04, from: "start" },
          ease: "power2.out",
          overwrite: "auto",
        },
      );
    }, list);
    return () => ctx.revert();
  }, [filtered]);

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
              ? "No members found."
              : "No matches for your search."}
          </p>
        ) : (
          <div
            ref={listRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 pb-24"
          >
            {filtered.map((m) => (
              <RosterMemberCard key={m.id} member={m} onSelect={() => setSelected(m)} />
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
    </>
  );
}
