"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteSmrutiPostAction, likeSmrutiPostAction } from "@/lib/smruti/actions";
import { smrutiPublicUrl } from "@/lib/smruti/public-url";
import type { SmrutiFeedPost } from "@/lib/smruti/types";
import { cn } from "@/lib/utils";

const CAPTION_PREVIEW_CHARS = 220;

function formatRelativeTime(value: string): string {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type CardProps = {
  post: SmrutiFeedPost;
  currentUserId: string;
  isOrganizer: boolean;
};

export function SmrutiPostCard({ post, currentUserId, isOrganizer }: CardProps) {
  const router = useRouter();
  const [pendingLike, startLike] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const [slide, setSlide] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const urls = useMemo(
    () =>
      [...post.media]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((m) => smrutiPublicUrl(m.storage_path)),
    [post.media],
  );

  const authorName = post.author_display_name?.trim() || "Member";
  const canDelete = post.author_id === currentUserId || isOrganizer;
  const captionLong = post.caption.length > CAPTION_PREVIEW_CHARS;
  const captionShown =
    expanded || !captionLong ? post.caption : `${post.caption.slice(0, CAPTION_PREVIEW_CHARS)}…`;

  const onLike = () => {
    if (post.liked_by_me || pendingLike) return;
    startLike(async () => {
      const res = await likeSmrutiPostAction(post.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!canDelete || pendingDelete) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    startDelete(async () => {
      const res = await deleteSmrutiPostAction(post.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Post deleted.");
      router.refresh();
    });
  };

  if (!urls.length) return null;

  const n = urls.length;
  const idx = Math.min(Math.max(slide, 0), n - 1);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm",
        "ring-border/40",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {post.author_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author_avatar_url}
              alt=""
              className="size-9 shrink-0 rounded-full object-cover ring-1 ring-border/60"
            />
          ) : (
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-border/60"
              aria-hidden
            >
              {authorName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{authorName}</p>
            <p className="text-[11px] text-muted-foreground">{formatRelativeTime(post.created_at)}</p>
          </div>
        </div>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            disabled={pendingDelete}
            onClick={onDelete}
            aria-label="Delete post"
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        ) : null}
      </header>

      <div className="relative aspect-[4/5] w-full bg-muted/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[idx]}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
        {n > 1 ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
              <span className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                {idx + 1} / {n}
              </span>
            </div>
            <button
              type="button"
              className="absolute left-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-[2px] transition hover:bg-black/50 disabled:opacity-0"
              aria-label="Previous photo"
              disabled={idx === 0}
              onClick={() => setSlide((s) => Math.max(0, s - 1))}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-[2px] transition hover:bg-black/50 disabled:opacity-0"
              aria-label="Next photo"
              disabled={idx >= n - 1}
              onClick={() => setSlide((s) => Math.min(n - 1, s + 1))}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      <div className="space-y-2 px-3 py-3 sm:px-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onLike}
            disabled={post.liked_by_me || pendingLike}
            aria-label={post.liked_by_me ? "Liked" : "Like"}
            aria-pressed={post.liked_by_me}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-1 py-1 text-sm font-semibold tabular-nums transition active:scale-95 disabled:opacity-50 motion-reduce:active:scale-100",
              post.liked_by_me ? "text-primary" : "text-foreground/70 hover:text-foreground",
            )}
          >
            <Heart
              className={cn("size-6", post.liked_by_me ? "scale-105" : "")}
              strokeWidth={post.liked_by_me ? 0 : 2}
              fill={post.liked_by_me ? "currentColor" : "none"}
              aria-hidden
            />
            {post.like_count > 0 ? <span>{post.like_count}</span> : null}
          </button>
        </div>

        <div className="text-sm leading-relaxed text-foreground">
          <span className="whitespace-pre-wrap break-words">{captionShown}</span>
          {captionLong && !expanded ? (
            <button
              type="button"
              className="ml-1 inline font-semibold text-primary hover:underline"
              onClick={() => setExpanded(true)}
            >
              Read more
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
