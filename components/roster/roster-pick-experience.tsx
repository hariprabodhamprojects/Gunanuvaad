"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RosterPersonDialog } from "@/components/roster/roster-person-dialog";
import type { RosterMember } from "@/lib/roster/types";
import { cn } from "@/lib/utils";

type Props = {
  members: RosterMember[];
  currentUserId: string;
};

function RosterTile({
  member,
  onSelect,
}: {
  member: RosterMember;
  onSelect: () => void;
}) {
  const tileRef = useRef<HTMLDivElement>(null);

  const onEnter = () => {
    const el = tileRef.current;
    if (!el) return;
    gsap.to(el, {
      scale: 1.08,
      y: -6,
      duration: 0.28,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const onLeave = () => {
    const el = tileRef.current;
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
        "group relative flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "touch-manipulation",
      )}
      aria-label={`Open ${member.display_name}`}
    >
      <div
        ref={tileRef}
        data-roster-tile
        className={cn(
          "flex w-full flex-col items-center gap-1.5 rounded-2xl pb-0.5 will-change-transform",
          "transition-[box-shadow,background-color] duration-300 ease-out",
          "group-hover:bg-primary/[0.06] group-hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]",
          "dark:group-hover:shadow-[0_14px_44px_-10px_rgba(0,0,0,0.55)]",
        )}
      >
        <span className="relative mt-0.5 inline-flex rounded-full p-[3px] transition-[background,box-shadow] duration-300 group-hover:bg-gradient-to-br group-hover:from-primary/35 group-hover:to-primary/5 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={member.avatar_url}
            alt=""
            className="aspect-square size-full max-h-[4.75rem] max-w-[4.75rem] rounded-full object-cover shadow-md ring-2 ring-border/70 transition-[transform,box-shadow,ring-color] duration-300 group-hover:ring-primary/45"
          />
        </span>
        <span className="line-clamp-2 w-full px-0.5 text-[0.65rem] font-medium leading-tight text-foreground transition-colors duration-200 group-hover:text-primary sm:text-xs">
          {member.display_name}
        </span>
      </div>
    </button>
  );
}

export function RosterPickExperience({ members, currentUserId }: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<RosterMember | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return members;
    return members.filter((m) => m.display_name.toLowerCase().includes(s));
  }, [members, q]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const tiles = grid.querySelectorAll("[data-roster-tile]");
    if (tiles.length === 0) return;
    const ctx = gsap.context(() => {
      // Entrance: opacity + y only — leaves transform free for hover tweens on the same node.
      gsap.fromTo(
        tiles,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.36,
          stagger: { each: 0.035, from: "start" },
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
            className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6"
          >
            {filtered.map((m) => (
              <RosterTile key={m.id} member={m} onSelect={() => setSelected(m)} />
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
      />
    </>
  );
}
