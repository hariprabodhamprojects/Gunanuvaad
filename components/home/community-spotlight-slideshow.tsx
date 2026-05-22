"use client";

import gsap from "gsap";
import { Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { advanceCommunitySpotlightDeck } from "@/lib/home/community-spotlight-actions";
import type { CommunitySpotlightSlide } from "@/lib/home/community-spotlight";
import { smrutiPublicUrl } from "@/lib/smruti/public-url";
import { useRealtimeRefresh } from "@/lib/supabase/use-realtime-refresh";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 4500;
const SLIDE_DURATION = 0.28;
const SLIDE_EASE = "power3.out";

type DragState = {
  startX: number;
  startY: number;
  width: number;
  pointerId: number;
  dragging: boolean;
  locked: "h" | "v" | null;
  dragDx: number;
};

/**
 * Mobile is intentionally tall so a vertical photo can breathe AND the caption /
 * note stays fully readable. From `sm` up we switch to a compact side-by-side
 * layout, so tablets and laptops don't waste vertical space.
 */
const VIEWPORT_H =
  "h-[460px] sm:h-[308px] md:h-[328px] lg:h-[348px] xl:h-[368px]";

const spotlightHeadlineClass =
  "min-w-0 flex-1 truncate font-heading font-semibold text-foreground text-sm sm:text-base md:text-lg lg:text-xl";

/** Ghun + Smruti text — primary orange, matches Smruti feed captions. */
const spotlightHighlightTextClass =
  "font-heading text-pretty text-left font-semibold leading-relaxed text-primary text-base sm:text-[17px] sm:leading-relaxed md:text-lg lg:text-xl lg:leading-relaxed xl:text-[1.35rem] xl:leading-relaxed";

/** Swadhyay body — foreground for long-form reflection text. */
const spotlightBodyClass =
  "text-pretty text-left font-medium leading-relaxed text-foreground text-base sm:text-[17px] sm:leading-relaxed md:text-lg lg:text-xl lg:leading-relaxed xl:text-[1.35rem] xl:leading-relaxed";

const spotlightMetaClass =
  "shrink-0 truncate text-left font-medium text-muted-foreground text-xs sm:text-sm md:text-base lg:text-lg";

const spotlightScrollClass =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent";

/** Phone: photo on top (full width). sm+: side column beside text. */
const photoSlideLayoutClass =
  "flex min-h-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-3.5 md:gap-5 lg:gap-6";

/** Full photo in frame — object-contain, no crop (same treatment for Ghun + Smruti). */
const spotlightPhotoImgClass = "max-h-full max-w-full object-contain object-center";

/** Phone: photo grows to fill the card (vertical portrait reads large). sm+: side column. */
const spotlightPhotoColumnBase =
  "relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border/50 sm:h-auto sm:flex-none sm:shrink-0 sm:self-stretch";

const ghunPhotoColumnClass = cn(
  spotlightPhotoColumnBase,
  "sm:w-[11.5rem] sm:max-w-[11.5rem] md:w-[12.5rem] md:max-w-[12.5rem] lg:w-[14rem] lg:max-w-[14rem] xl:w-[15rem] xl:max-w-[15rem]",
);

const smrutiPhotoColumnClass = cn(
  spotlightPhotoColumnBase,
  "sm:w-[13rem] sm:max-w-[13rem] md:w-[14.5rem] md:max-w-[14.5rem] lg:w-[16rem] lg:max-w-[16rem] xl:w-[17.5rem] xl:max-w-[17.5rem]",
);

/**
 * Smruti caption — reserved band under the photo on phone (~3.5 lines).
 */
const smrutiCaptionBoxClass =
  "shrink-0 max-h-[5.75rem] w-full overflow-y-auto overscroll-y-contain sm:min-h-0 sm:max-h-none sm:flex-1 sm:shrink sm:self-stretch sm:py-1";

/**
 * Ghun note — slightly taller band than Smruti caption so the ghun text is visible;
 * photo above is still full-width / flex-1 like Smruti, just ~1.5rem shorter.
 */
const ghunNoteBoxClass =
  "shrink-0 min-h-[4.25rem] max-h-[7.25rem] w-full overflow-y-auto overscroll-y-contain sm:min-h-0 sm:max-h-none sm:flex-1 sm:shrink sm:self-stretch sm:justify-center sm:py-1";

function chip(kind: CommunitySpotlightSlide["kind"]): string {
  if (kind === "note") return "Ghun";
  if (kind === "smruti") return "Smruti";
  return "Swadhyay";
}

/** Same placeholder as calendar / roster for invite-only recipients. */
const INVITE_PLACEHOLDER_AVATAR = "/logo.png";

function headline(slide: CommunitySpotlightSlide): string {
  if (slide.kind === "note") {
    return slide.recipient_display_name.trim() || "Someone";
  }
  return slide.author_display_name.trim() || "Member";
}

function SlideContent({ slide }: { slide: CommunitySpotlightSlide }) {
  if (slide.kind === "note") {
    const avatarSrc = slide.recipient_avatar_url.trim();
    const src = avatarSrc.startsWith("http") ? avatarSrc : INVITE_PLACEHOLDER_AVATAR;
    return (
      <div className={photoSlideLayoutClass}>
        <div className={ghunPhotoColumnClass}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className={spotlightPhotoImgClass}
          />
        </div>
        <div className={cn(ghunNoteBoxClass, spotlightHighlightTextClass, spotlightScrollClass)}>
          <p className="whitespace-pre-wrap">{slide.body}</p>
        </div>
      </div>
    );
  }

  if (slide.kind === "smruti") {
    const src = smrutiPublicUrl(slide.storage_path);
    return (
      <div className={photoSlideLayoutClass}>
        <div className={smrutiPhotoColumnClass}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className={spotlightPhotoImgClass}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className={cn(smrutiCaptionBoxClass, spotlightHighlightTextClass, spotlightScrollClass)}>
          <p className="whitespace-pre-wrap">{slide.caption}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 sm:gap-2 md:gap-2.5">
      <p className={spotlightMetaClass}>{slide.topic_title}</p>
      <div className={cn("min-h-0 flex-1 overflow-y-auto", spotlightBodyClass, spotlightScrollClass)}>
        <p className="whitespace-pre-wrap">{slide.body}</p>
      </div>
    </div>
  );
}

function SlideFrame({ slide }: { slide: CommunitySpotlightSlide }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-2 px-3 py-2.5 sm:gap-2.5 sm:px-3.5 sm:py-3",
        "md:gap-3 md:px-5 md:py-4 lg:px-6 lg:py-5",
      )}
    >
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          {chip(slide.kind)}
        </span>
        <p className={spotlightHeadlineClass}>{headline(slide)}</p>
        {slide.kind === "smruti" ? (
          <ImageIcon className="size-4 shrink-0 text-primary/70 sm:size-[1.125rem] md:size-5" aria-hidden />
        ) : null}
      </div>
      <SlideContent slide={slide} />
    </div>
  );
}

type Props = {
  slides: CommunitySpotlightSlide[];
};

export function CommunitySpotlightSlideshow({ slides }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [isHeld, setIsHeld] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSyncRef = useRef(true);
  const indexRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const isDraggingRef = useRef(false);
  const advancingDeckRef = useRef(false);

  useRealtimeRefresh({
    channel: "home-community-spotlight",
    subscriptions: [
      { table: "approved_daily_notes" },
      { table: "daily_notes" },
      { table: "profiles" },
      { table: "smruti_posts" },
      { table: "smruti_post_media" },
      { table: "swadhyay_posts" },
    ],
  });

  const safeIndex = slides.length === 0 ? 0 : Math.min(index, slides.length - 1);
  const canSwipe = slides.length > 1;
  const slidesKey = slides.map((s) => `${s.kind}-${s.id}`).join("|");

  useLayoutEffect(() => {
    setIndex(0);
    firstSyncRef.current = true;
    advancingDeckRef.current = false;
  }, [slidesKey]);

  useLayoutEffect(() => {
    indexRef.current = safeIndex;
  }, [safeIndex]);

  const setTrackX = useCallback((slideIndex: number, dragOffset = 0) => {
    const track = trackRef.current;
    const vp = viewportRef.current;
    if (!track || !vp) return;
    const w = vp.offsetWidth;
    if (w === 0) return;
    gsap.set(track, { x: -slideIndex * w + dragOffset, overwrite: true });
  }, []);

  /**
   * Auto-advance through the current deck; after the last slide, load the next deck
   * instead of looping the same slides forever.
   */
  useLayoutEffect(() => {
    if (!canSwipe || isHeld) return;
    const t = window.setInterval(() => {
      setIndex((i) => {
        if (i >= slides.length - 1) {
          if (!advancingDeckRef.current) {
            advancingDeckRef.current = true;
            void advanceCommunitySpotlightDeck().then((res) => {
              if (res.ok) router.refresh();
              else advancingDeckRef.current = false;
            });
          }
          return i;
        }
        return i + 1;
      });
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [canSwipe, isHeld, slides.length, router]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const vp = viewportRef.current;
    if (!track || !vp || slides.length === 0) return;
    if (isDraggingRef.current) return;

    const w = vp.offsetWidth;
    if (w === 0) return;

    const x = -safeIndex * w;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (firstSyncRef.current || reduceMotion || slides.length <= 1) {
      gsap.set(track, { x });
      firstSyncRef.current = false;
      return;
    }

    gsap.to(track, {
      x,
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE,
      overwrite: "auto",
    });
  }, [safeIndex, slides]);

  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp || slides.length === 0) return;

    const sync = () => {
      if (isDraggingRef.current) return;
      setTrackX(indexRef.current);
    };

    const ro = new ResizeObserver(sync);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [slides.length, setTrackX]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canSwipe) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    setIsHeld(true);
    const vp = viewportRef.current;
    if (!vp) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      width: vp.offsetWidth,
      pointerId: e.pointerId,
      dragging: false,
      locked: null,
      dragDx: 0,
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
        isDraggingRef.current = false;
        return;
      }
      d.dragging = true;
      isDraggingRef.current = true;
      gsap.killTweensOf(trackRef.current);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    if (d.locked !== "h") return;

    e.preventDefault();
    let next = dx;
    const idx = indexRef.current;
    if (idx === 0 && next > 0) next *= 0.35;
    if (idx === slides.length - 1 && next < 0) next *= 0.35;
    d.dragDx = next;
    setTrackX(idx, next);
  };

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    setIsHeld(false);

    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) {
      dragRef.current = null;
      isDraggingRef.current = false;
      return;
    }

    const idx = indexRef.current;
    const threshold = Math.max(40, d.width * 0.18);
    let nextIndex = idx;

    if (d.dragging) {
      if (d.dragDx <= -threshold && idx < slides.length - 1) nextIndex = idx + 1;
      else if (d.dragDx >= threshold && idx > 0) nextIndex = idx - 1;
    }

    dragRef.current = null;
    isDraggingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const track = trackRef.current;
    const vp = viewportRef.current;
    if (!track || !vp) return;

    const w = vp.offsetWidth;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (nextIndex !== idx) {
      setIndex(nextIndex);
      return;
    }

    if (reduceMotion || !d.dragging) {
      gsap.set(track, { x: -idx * w });
      return;
    }

    gsap.to(track, {
      x: -idx * w,
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE,
      overwrite: "auto",
    });
  };

  if (slides.length === 0) return null;

  const current = slides[safeIndex] ?? slides[0];

  return (
    <section
      className="mx-auto w-full max-w-2xl space-y-2 lg:max-w-[36rem]"
      aria-label="Community spotlight"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-center text-xs font-bold uppercase tracking-[0.15em] text-primary/80 drop-shadow-sm">
        Community Spotlight
      </p>
      <div className="glass-card overflow-hidden transition-[transform,box-shadow,border-color] duration-[220ms] ease-[var(--ease-out-standard)]">
        <div className="relative p-0">
          <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_right,var(--palette-bg-subtle)_0%,transparent_8%,transparent_92%,var(--palette-bg-subtle)_100%)] opacity-25 mix-blend-overlay" />
          <div
            ref={viewportRef}
            className={cn(
              "w-full touch-pan-y overflow-hidden",
              canSwipe && "cursor-grab active:cursor-grabbing",
              VIEWPORT_H,
            )}
            aria-roledescription="carousel"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          >
            <div
              ref={trackRef}
              className="flex h-full will-change-transform"
              style={{ width: `${slides.length * 100}%` }}
            >
              {slides.map((s) => (
                <div
                  key={`${s.kind}-${s.id}`}
                  className="box-border h-full shrink-0"
                  style={{ width: `${100 / slides.length}%` }}
                >
                  <SlideFrame slide={s} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {slides.length > 1 ? (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Spotlight slide">
          {slides.map((s, i) => (
            <button
              key={`dot-${s.kind}-${s.id}`}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              className={cn(
                "size-2 rounded-full transition-[transform,background-color] duration-[180ms] ease-[var(--ease-out-standard)] active:scale-[0.97] motion-reduce:active:scale-100",
                i === safeIndex ? "bg-primary" : "bg-muted-foreground/25 hover:bg-muted-foreground/40",
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
      <span className="sr-only">
        {canSwipe
          ? "Swipe left or right to change slides. Press and hold to pause automatic rotation. "
          : null}
        {current
          ? current.kind === "note"
            ? `Ghun for ${current.recipient_display_name.trim() || "someone"}.`
            : current.kind === "smruti"
              ? `Smruti by ${current.author_display_name.trim() || "member"}.`
              : `Swadhyay in ${current.topic_title}.`
          : null}
      </span>
    </section>
  );
}
