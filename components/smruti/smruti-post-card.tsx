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

const CAPTION_PREVIEW_CHARS = 160;

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

function formatPostDate(value: string): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
        "overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm sm:rounded-2xl",
        "ring-border/30",
      )}
    >
      <header className="flex items-center gap-2 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5">
        {post.author_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.author_avatar_url}
            alt=""
            className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-border/50 sm:size-9 sm:rounded-full"
          />
        ) : (
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground ring-1 ring-border/50 sm:size-9 sm:rounded-full"
            aria-hidden
          >
            {authorName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-foreground sm:text-sm">
            {authorName}
          </p>
          <p className="truncate text-[10px] text-muted-foreground sm:hidden" title={post.created_at}>
            {formatRelativeTime(post.created_at)}
          </p>
        </div>
        <time
          className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:block"
          dateTime={post.created_at}
        >
          {formatPostDate(post.created_at)}
        </time>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive sm:size-9"
            disabled={pendingDelete}
            onClick={onDelete}
            aria-label="Delete post"
          >
            <Trash2 className="size-3.5 sm:size-4" aria-hidden />
          </Button>
        ) : null}
      </header>

      {/* Shorter on phones so the next post peeks into the fold (ref: Glimpses-style). */}
      <div className="px-2 pb-1.5 sm:px-3 sm:pb-2">
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl bg-muted/35",
            "h-[clamp(10.5rem,36svh,15.5rem)] sm:h-[clamp(12rem,42svh,20rem)] lg:aspect-[4/5] lg:h-auto lg:max-h-[min(70svh,28rem)]",
          )}
        >
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
              <div className="pointer-events-none absolute right-2 top-2 sm:right-2.5 sm:top-2.5">
                <span className="rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-[2px] sm:px-2 sm:text-[11px]">
                  {idx + 1}/{n}
                </span>
              </div>
              <button
                type="button"
                className="absolute left-0.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-[1px] transition hover:bg-black/55 active:scale-95 disabled:pointer-events-none disabled:opacity-0 sm:left-1 sm:size-9"
                aria-label="Previous photo"
                disabled={idx === 0}
                onClick={() => setSlide((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft className="size-4 sm:size-5" aria-hidden />
              </button>
              <button
                type="button"
                className="absolute right-0.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-[1px] transition hover:bg-black/55 active:scale-95 disabled:pointer-events-none disabled:opacity-0 sm:right-1 sm:size-9"
                aria-label="Next photo"
                disabled={idx >= n - 1}
                onClick={() => setSlide((s) => Math.min(n - 1, s + 1))}
              >
                <ChevronRight className="size-4 sm:size-5" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-0 sm:px-3 sm:pb-2">
        <button
          type="button"
          onClick={onLike}
          disabled={post.liked_by_me || pendingLike}
          aria-label={post.liked_by_me ? "Liked" : "Like"}
          aria-pressed={post.liked_by_me}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-md py-0.5 text-xs font-semibold tabular-nums transition active:scale-95 disabled:opacity-45 motion-reduce:active:scale-100 sm:text-sm",
            post.liked_by_me ? "text-primary" : "text-foreground/70 hover:text-foreground",
          )}
        >
          <Heart
            className={cn("size-[1.125rem] sm:size-5", post.liked_by_me ? "scale-105" : "")}
            strokeWidth={post.liked_by_me ? 0 : 2}
            fill={post.liked_by_me ? "currentColor" : "none"}
            aria-hidden
          />
          {post.like_count > 0 ? (
            <span>
              {post.like_count} {post.like_count === 1 ? "like" : "likes"}
            </span>
          ) : post.liked_by_me ? (
            <span className="text-primary">Liked</span>
          ) : (
            <span className="text-muted-foreground">Like</span>
          )}
        </button>
        {n > 1 ? (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-1" role="tablist" aria-label="Photos">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === idx}
                aria-label={`Photo ${i + 1} of ${n}`}
                className={cn(
                  "h-1.5 min-w-1.5 rounded-full transition-all",
                  i === idx ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/35 hover:bg-muted-foreground/55",
                )}
                onClick={() => setSlide(i)}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1" aria-hidden />
        )}
      </div>

      <div className="px-2.5 pb-2.5 pt-0 sm:px-3 sm:pb-3">
        <div className="text-xs leading-snug text-foreground sm:text-sm sm:leading-relaxed">
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
