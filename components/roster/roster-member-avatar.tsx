"use client";

import { cn } from "@/lib/utils";

type Props = {
  displayName: string;
  avatarUrl: string;
  /** Skip Supabase URLs for invite-only rows — use app logo (one small cached file). */
  hasSignedUp: boolean;
  className?: string;
};

/**
 * Roster list avatars: lazy + low priority so Home does not download 200+ photos at once.
 */
export function RosterMemberAvatar({ displayName, avatarUrl, hasSignedUp, className }: Props) {
  const src =
    hasSignedUp && avatarUrl.startsWith("http") ? avatarUrl : "/logo.png";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className={cn("size-full object-cover", className)}
    />
  );
}
