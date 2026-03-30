"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Search } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  const cardInnerRef = useRef<HTMLDivElement>(null);

  const onEnter = () => {
    const el = cardInnerRef.current;
    if (!el) return;
    gsap.to(el, {
      scale: 1.02,
      y: -4,
      duration: 0.28,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const onLeave = () => {
    const el = cardInnerRef.current;
    if (!el) return;
    gsap.to(el, {
      scale: 1,
      y: 0,
      duration: 0.35,
      ease: "power3.out",
      overwrite: "auto",
    });
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className={cn(
        "group h-full w-full min-w-0 text-left outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "touch-manipulation rounded-xl",
      )}
      aria-label={`Open ${member.display_name}`}
    >
      <Card
        size="sm"
        className={cn(
          "h-full min-h-[11rem] gap-0 overflow-hidden p-0 py-0 shadow-sm ring-border/60",
          "transition-shadow duration-300 group-hover:shadow-md group-hover:ring-primary/25",
        )}
      >
        <div
          ref={cardInnerRef}
          data-roster-tile
          className="flex h-full min-h-0 flex-col will-change-transform"
        >
          <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={member.avatar_url}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
          <CardContent className="flex flex-1 flex-col justify-center px-2.5 py-2.5 sm:px-3 sm:py-3">
            <p className="line-clamp-2 text-center font-heading text-xs font-medium leading-snug text-foreground sm:text-sm">
              {member.display_name}
            </p>
          </CardContent>
        </div>
      </Card>
    </button>
  );
}

export function RosterPickExperience({ members, currentUserId, dailyCampaignStatus }: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<RosterMember | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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
    const grid = gridRef.current;
    if (!grid) return;
    const tiles = grid.querySelectorAll("[data-roster-tile]");
    if (tiles.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        tiles,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.38,
          stagger: { each: 0.04, from: "start" },
          ease: "power3.out",
          overwrite: "auto",
        },
      );
    }, grid);
    return () => ctx.revert();
  }, [filtered]);

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find someone…"
            className="h-12 rounded-xl border-border/80 bg-background/60 pl-10 shadow-sm backdrop-blur-sm"
            aria-label="Search roster by name"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-14 text-center text-sm text-muted-foreground">
            {members.length === 0
              ? "No one else here yet—check back after more people join."
              : "No matches."}
          </p>
        ) : (
          <div
            ref={gridRef}
            className={cn(
              "grid items-stretch gap-3 sm:gap-4",
              "grid-cols-2",
              "sm:grid-cols-3",
              "md:grid-cols-4",
              "lg:grid-cols-5",
              "xl:grid-cols-6",
            )}
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
