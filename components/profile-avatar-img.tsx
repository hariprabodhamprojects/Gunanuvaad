"use client";

import { useFreshProfileAvatar } from "@/lib/profile/use-fresh-profile-avatar";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  initialUrl: string;
  alt: string;
  className?: string;
};

/** Profile photo that refetches on PWA resume and after uploads (avoids stale mobile cache). */
export function ProfileAvatarImg({ userId, initialUrl, alt, className }: Props) {
  const src = useFreshProfileAvatar(userId, initialUrl);

  if (!src.trim()) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase public URL
    <img
      key={src}
      src={src}
      alt={alt}
      decoding="async"
      className={cn(className)}
    />
  );
}
