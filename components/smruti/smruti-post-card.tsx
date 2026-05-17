"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteSmrutiPostAction, likeSmrutiPostAction } from "@/lib/smruti/actions";
import { smrutiPublicUrl, SMRUTI_PHOTO_MATTE_URL } from "@/lib/smruti/public-url";
import type { SmrutiFeedPost, SmrutiLikePreview } from "@/lib/smruti/types";
import { cn } from "@/lib/utils";

const LIKE_PREVIEW_MAX = 3;

type LikeUiState = {
  likedByMe: boolean;
  likeCount: number;
  likePreview: SmrutiLikePreview[];
};

function likeStateFromPost(post: SmrutiFeedPost): LikeUiState {
  return {
    likedByMe: post.liked_by_me,
    likeCount: post.like_count,
    likePreview: post.like_preview,
  };
}

const CAPTION_PREVIEW_CHARS = 160;

function formatPostDate(value: string): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function likerInitials(name: string | null): string {
  const n = (name ?? "").trim();
  if (!n) return "?";
  const p = n.split(/\s+/).filter(Boolean);
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase();
}

function LikePreviewStack({ preview }: { preview: SmrutiFeedPost["like_preview"] }) {
  if (!preview.length) {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-2 ring-card shadow-sm sm:size-8">
        <Heart className="size-3.5 sm:size-4" strokeWidth={2.2} fill="currentColor" aria-hidden />
      </span>
    );
  }
  return (
    <div className="flex items-center pr-0.5">
      {preview.map((liker, i) => (
        <span
          key={`${liker.display_name ?? ""}-${i}`}
          className={cn(
            "relative inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-bold text-primary/90 ring-2 ring-card shadow-sm sm:size-8",
            i > 0 && "-ml-2 sm:-ml-2.5",
          )}
          style={{ zIndex: i + 1 }}
          title={(liker.display_name ?? "").trim() || "Member"}
        >
          {liker.avatar_url?.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={liker.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <span aria-hidden>{likerInitials(liker.display_name)}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/**
 * Fixed-aspect photo frame with parchment matte + finger swipe.
 * Every photo sits inside the same square frame (object-contain), so post heights
 * stay uniform regardless of source aspect ratio. Horizontal pointer drag advances
 * slides; vertical movement falls through to page scroll.
 */
function PhotoCarousel({
  urls,
  idx,
  setSlide,
}: {
  urls: string[];
  idx: number;
  setSlide: (n: number) => void;
}) {
  const n = urls.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    width: number;
    pointerId: number;
    dragging: boolean;
    locked: "h" | "v" | null;
  } | null>(null);
  const [dragDx, setDragDx] = useState(0);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (n <= 1) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = trackRef.current;
    if (!el) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      width: el.clientWidth,
      pointerId: e.pointerId,
      dragging: false,
      locked: null,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.locked === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (d.locked === "v") {
        dragRef.current = null;
        return;
      }
      d.dragging = true;
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {}
    }
    if (d.locked !== "h") return;
    e.preventDefault();
    let next = dx;
    if (idx === 0 && next > 0) next *= 0.35;
    if (idx === n - 1 && next < 0) next *= 0.35;
    setDragDx(next);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const threshold = Math.max(40, d.width * 0.18);
    if (d.dragging) {
      if (dragDx <= -threshold && idx < n - 1) setSlide(idx + 1);
      else if (dragDx >= threshold && idx > 0) setSlide(idx - 1);
    }
    dragRef.current = null;
    setDragDx(0);
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const translatePct = -idx * 100;
  const dragPct =
    dragRef.current && trackRef.current
      ? (dragDx / trackRef.current.clientWidth) * 100
      : 0;
  const dragging = dragRef.current?.dragging ?? false;

  return (
    <div className="px-2 pb-1 sm:px-3 sm:pb-1.5">
      <div
        ref={trackRef}
        className={cn(
          "relative isolate aspect-square w-full overflow-hidden rounded-xl select-none",
          "ring-1 ring-inset ring-stone-900/10",
          "touch-pan-y",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="flex h-full w-full"
          style={{
            transform: `translate3d(calc(${translatePct}% + ${dragPct}%), 0, 0)`,
            transition: dragging ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {urls.map((src, i) => (
            <div
              key={src}
              className="relative flex h-full w-full shrink-0 items-center justify-center overflow-hidden"
            >
              <div
                aria-hidden
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-scroll"
                style={{ backgroundImage: `url(${SMRUTI_PHOTO_MATTE_URL})` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-stone-950/[0.04] to-stone-950/[0.07]"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                draggable={false}
                className="relative z-[2] max-h-full max-w-full object-contain object-center"
                loading={i === idx ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))}
        </div>
        {n > 1 ? (
          <div className="pointer-events-none absolute right-2 top-2 z-[3] sm:right-2.5 sm:top-2.5">
            <span className="rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-[2px] sm:px-2 sm:text-[11px]">
              {idx + 1}/{n}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type CardProps = {
  post: SmrutiFeedPost;
  currentUserId: string;
  currentUserDisplayName: string | null;
  currentUserAvatarUrl: string | null;
  isOrganizer: boolean;
};

export function SmrutiPostCard({
  post,
  currentUserId,
  currentUserDisplayName,
  currentUserAvatarUrl,
  isOrganizer,
}: CardProps) {
  const router = useRouter();
  const likeInFlightRef = useRef(false);
  const [like, setLike] = useState<LikeUiState>(() => likeStateFromPost(post));
  const [hidden, setHidden] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [slide, setSlide] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLike(likeStateFromPost(post));
  }, [post.id, post.liked_by_me, post.like_count, post.like_preview]);

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
    if (like.likedByMe || likeInFlightRef.current) return;

    const previous = like;
    const optimistic: LikeUiState = {
      likedByMe: true,
      likeCount: previous.likeCount + 1,
      likePreview: [
        {
          display_name: currentUserDisplayName,
          avatar_url: currentUserAvatarUrl,
        },
        ...previous.likePreview,
      ].slice(0, LIKE_PREVIEW_MAX),
    };

    likeInFlightRef.current = true;
    setLike(optimistic);

    void likeSmrutiPostAction(post.id).then((res) => {
      likeInFlightRef.current = false;
      if (!res.ok) {
        setLike(previous);
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!canDelete || pendingDelete) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;

    setPendingDelete(true);
    setHidden(true);

    void deleteSmrutiPostAction(post.id).then((res) => {
      setPendingDelete(false);
      if (!res.ok) {
        setHidden(false);
        toast.error(res.error);
        return;
      }
      toast.success("Post deleted.");
      router.refresh();
    });
  };

  if (hidden || !urls.length) return null;

  const n = urls.length;
  const idx = Math.min(Math.max(slide, 0), n - 1);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm sm:rounded-2xl",
        "ring-border/30",
      )}
    >
      <header className="flex items-center gap-2.5 px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3">
        {post.author_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.author_avatar_url}
            alt=""
            className="size-9 shrink-0 rounded-md object-cover ring-1 ring-border/50 sm:rounded-lg"
          />
        ) : (
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-border/50 sm:rounded-lg"
            aria-hidden
          >
            {authorName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-[15px] font-semibold tracking-tight text-primary sm:text-base">
            {authorName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <time
            className="font-heading text-xs font-medium tabular-nums text-primary sm:text-sm"
            dateTime={post.created_at}
          >
            {formatPostDate(post.created_at)}
          </time>
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8 shrink-0 text-primary/60 hover:text-destructive sm:size-9"
              disabled={pendingDelete}
              onClick={onDelete}
              aria-label="Delete post"
            >
              <Trash2 className="size-3.5 sm:size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </header>

      <PhotoCarousel urls={urls} idx={idx} setSlide={setSlide} />

      <div className="flex items-center gap-2 px-2.5 pb-1 pt-0 sm:px-3 sm:pb-1.5">
        {like.likeCount > 0 ? (
          like.likedByMe ? (
            <div
              className="flex min-w-0 shrink-0 items-center gap-2.5 py-0.5 text-primary/90"
              aria-label={`${like.likeCount} ${like.likeCount === 1 ? "like" : "likes"}`}
            >
              <LikePreviewStack preview={like.likePreview} />
              <span className="text-xs font-semibold tabular-nums sm:text-sm">
                {like.likeCount} {like.likeCount === 1 ? "Like" : "Likes"}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLike}
              aria-label={`Like — ${like.likeCount} ${like.likeCount === 1 ? "like" : "likes"} so far`}
              className={cn(
                "flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg py-0.5 text-left transition touch-manipulation",
                "text-primary hover:opacity-90 active:scale-[0.98] motion-reduce:active:scale-100",
              )}
            >
              <LikePreviewStack preview={like.likePreview} />
              <span className="text-xs font-semibold tabular-nums sm:text-sm">
                {like.likeCount} {like.likeCount === 1 ? "Like" : "Likes"}
              </span>
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={onLike}
            aria-label="Like this post"
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg py-0.5 text-xs font-semibold transition touch-manipulation",
              "text-primary/85 hover:text-primary active:scale-[0.98] sm:text-sm",
            )}
          >
            <Heart className="size-4 sm:size-[1.125rem]" strokeWidth={2} aria-hidden />
            <span>Like</span>
          </button>
        )}
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
                  "h-1.5 min-w-1.5 touch-manipulation rounded-full transition-all",
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

      <div className="px-3 pb-1.5 pl-5 pr-3 pt-1 sm:px-4 sm:pb-2 sm:pl-6 sm:pr-4 sm:pt-1.5">
        <div className="font-heading text-base font-semibold leading-relaxed text-primary sm:text-lg sm:leading-relaxed">
          <span className="whitespace-pre-wrap break-words">{captionShown}</span>
          {captionLong && !expanded ? (
            <button
              type="button"
              className="ml-1.5 inline text-base font-semibold text-primary underline-offset-2 hover:underline sm:text-lg"
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
