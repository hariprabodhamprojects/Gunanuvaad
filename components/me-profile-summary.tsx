"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ChangeAvatarControl } from "@/components/change-avatar-control";

type Props = {
  displayName: string;
  avatarUrl: string | null;
  email: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

/**
 * Profile preview for /me (name from invite list; photo editable).
 */
export function MeProfileSummary({ displayName, avatarUrl, email }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.38, ease: "power2.out" },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  const initials = initialsFromName(displayName);

  return (
    <div ref={rootRef} className="glass-card overflow-hidden">
      <div className="flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
        <div className="relative size-[4.25rem] shrink-0 sm:size-24">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase public URL
            <img
              src={avatarUrl}
              alt={displayName}
              className="size-full rounded-full object-cover shadow-md ring-2 ring-border/80"
            />
          ) : (
            <div
              className="flex size-full items-center justify-center rounded-full bg-muted font-heading text-lg font-semibold text-muted-foreground shadow-inner ring-2 ring-border/80 sm:text-xl"
              aria-hidden
            >
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">{displayName}</h1>
            <p className="truncate text-sm text-muted-foreground" title={email}>
              {email}
            </p>
          </div>
          <ChangeAvatarControl variant="outline" size="sm" className="w-full sm:w-auto" />
        </div>
      </div>
    </div>
  );
}
