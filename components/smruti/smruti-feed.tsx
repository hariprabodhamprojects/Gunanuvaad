"use client";

import { SmrutiPostCard } from "@/components/smruti/smruti-post-card";
import type { SmrutiFeedPost } from "@/lib/smruti/types";

type Props = {
  posts: SmrutiFeedPost[];
  currentUserId: string;
  isOrganizer: boolean;
};

export function SmrutiFeed({ posts, currentUserId, isOrganizer }: Props) {
  if (!posts.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
        No posts yet. Be the first to share a moment.
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 sm:gap-4 lg:gap-5">
      {posts.map((post) => (
        <SmrutiPostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          isOrganizer={isOrganizer}
        />
      ))}
    </div>
  );
}
