"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteSmrutiPostAction, likeSmrutiPostAction } from "@/lib/smruti/actions";
import { smrutiPublicUrl, SMRUTI_PHOTO_MATTE_URL } from "@/lib/smruti/public-url";
import type { SmrutiFeedPost } from "@/lib/smruti/types";
import { cn } from "@/lib/utils";

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

      {/* Full photo (object-contain) on parchment matte — no cropping; optional parallax matte on md+. */}
      <div className="px-2 pb-1 sm:px-3 sm:pb-1.5">
        <div
          className={cn(
            "relative isolate flex min-h-[9.5rem] w-full items-center justify-center overflow-hidden rounded-xl",
            "ring-1 ring-inset ring-stone-900/10",
          )}
        >
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-scroll",
              "md:bg-fixed md:motion-reduce:bg-scroll",
            )}
            style={{ backgroundImage: `url(${SMRUTI_PHOTO_MATTE_URL})` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-stone-950/[0.04] to-stone-950/[0.07]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={urls[idx]}
            src={urls[idx]}
            alt=""
            className="relative z-[2] max-h-[min(76svh,34rem)] w-full max-w-full object-contain object-center sm:max-h-[min(78svh,38rem)]"
            loading="lazy"
            decoding="async"
          />
          {n > 1 ? (
            <>
              <div className="pointer-events-none absolute right-2 top-2 z-[3] sm:right-2.5 sm:top-2.5">
                <span className="rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-[2px] sm:px-2 sm:text-[11px]">
                  {idx + 1}/{n}
                </span>
              </div>
              <button
                type="button"
                className="absolute left-0.5 top-1/2 z-[3] flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-[1px] transition hover:bg-black/55 active:scale-95 disabled:pointer-events-none disabled:opacity-0 sm:left-1 sm:size-9"
                aria-label="Previous photo"
                disabled={idx === 0}
                onClick={() => setSlide((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft className="size-4 sm:size-5" aria-hidden />
              </button>
              <button
                type="button"
                className="absolute right-0.5 top-1/2 z-[3] flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-[1px] transition hover:bg-black/55 active:scale-95 disabled:pointer-events-none disabled:opacity-0 sm:right-1 sm:size-9"
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

      <div className="flex items-center gap-2 px-2.5 pb-1 pt-0 sm:px-3 sm:pb-1.5">
        {post.like_count > 0 ? (
          post.liked_by_me ? (
            <div
              className="flex min-w-0 shrink-0 items-center gap-2.5 py-0.5 text-primary/90"
              aria-label={`${post.like_count} ${post.like_count === 1 ? "like" : "likes"}`}
            >
              <LikePreviewStack preview={post.like_preview} />
              <span className="text-xs font-semibold tabular-nums sm:text-sm">
                {post.like_count} {post.like_count === 1 ? "Like" : "Likes"}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLike}
              disabled={pendingLike}
              aria-label={`Like — ${post.like_count} ${post.like_count === 1 ? "like" : "likes"} so far`}
              className={cn(
                "flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg py-0.5 text-left transition",
                "text-primary hover:opacity-90 active:scale-[0.98] disabled:opacity-55 motion-reduce:active:scale-100",
              )}
            >
              <LikePreviewStack preview={post.like_preview} />
              <span className="text-xs font-semibold tabular-nums sm:text-sm">
                {post.like_count} {post.like_count === 1 ? "Like" : "Likes"}
              </span>
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={onLike}
            disabled={pendingLike}
            aria-label="Like this post"
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg py-0.5 text-xs font-semibold transition",
              "text-primary/85 hover:text-primary active:scale-[0.98] disabled:opacity-55 sm:text-sm",
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
