"use client";

import gsap from "gsap";
import { Image as ImageIcon, User } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { CommunitySpotlightSlide } from "@/lib/home/community-spotlight";
import { SMRUTI_PHOTO_MATTE_URL, smrutiPublicUrl } from "@/lib/smruti/public-url";
import { useRealtimeRefresh } from "@/lib/supabase/use-realtime-refresh";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 4500;
const SLIDE_DURATION = 0.28;
const SLIDE_EASE = "power3.out";

/** Tall enough for portrait Smruti; ghun/swadhyay slides fill height with flex. */
const VIEWPORT_H = "h-[min(52dvh,320px)] min-h-[280px] sm:h-[300px] md:h-[380px] lg:h-[420px]";

const spotlightCaptionClass =
  "font-heading line-clamp-3 shrink-0 text-center font-semibold leading-snug text-primary text-base sm:text-lg md:text-xl";

const spotlightHeadlineClass =
  "min-w-0 flex-1 truncate font-heading text-base font-semibold text-foreground sm:text-lg md:text-xl";

const spotlightBodyClass =
  "text-pretty text-center font-medium leading-snug text-foreground text-base sm:text-lg sm:leading-relaxed md:text-xl md:leading-relaxed";

const spotlightMetaClass =
  "shrink-0 truncate text-center font-medium text-muted-foreground text-sm sm:text-base md:text-lg";

function chip(kind: CommunitySpotlightSlide["kind"]): string {
  if (kind === "note") return "Ghun";
  if (kind === "smruti") return "Smruti";
  return "Swadhyay";
}

function headline(slide: CommunitySpotlightSlide): string {
  if (slide.kind === "note") return slide.recipient_display_name.trim() || "Community member";
  return slide.author_display_name.trim() || "Member";
}

function SlideContent({ slide }: { slide: CommunitySpotlightSlide }) {
  if (slide.kind === "note") {
    const hasAvatar = slide.recipient_avatar_url.trim().length > 0;
    return (
      <div className="flex min-h-0 flex-1 flex-col items-stretch gap-2 sm:gap-3">
        <div
          className={cn(
            "relative mx-auto w-[min(72%,12.5rem)] shrink-0 overflow-hidden rounded-2xl",
            "bg-muted/40 ring-1 ring-border/50 shadow-sm",
            "aspect-[4/5] sm:w-[min(68%,14rem)] md:w-[min(62%,15.5rem)]",
          )}
        >
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.recipient_avatar_url}
              alt=""
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="size-full object-cover object-[center_12%]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <User className="size-14 opacity-60 sm:size-16" strokeWidth={1.25} aria-hidden />
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col justify-center overflow-y-auto overscroll-y-contain px-0.5",
            "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent",
          )}
        >
          <p className={cn(spotlightBodyClass, "whitespace-pre-wrap")}>{slide.body}</p>
        </div>
      </div>
    );
  }

  if (slide.kind === "smruti") {
    const src = smrutiPublicUrl(slide.storage_path);
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-2.5 md:gap-3">
        <div
          className={cn(
            "relative isolate flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg",
            "bg-muted/25 ring-1 ring-inset ring-border/40",
          )}
        >
          <div
            aria-hidden
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-scroll opacity-90"
            style={{ backgroundImage: `url(${SMRUTI_PHOTO_MATTE_URL})` }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="relative z-[1] max-h-full max-w-full object-contain object-center"
            loading="lazy"
            decoding="async"
          />
        </div>
        <p className={spotlightCaptionClass}>{slide.caption}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-3">
      <p className={spotlightMetaClass}>{slide.topic_title}</p>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col justify-center overflow-y-auto",
          "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent",
        )}
      >
        <p className={cn(spotlightBodyClass, "whitespace-pre-wrap")}>{slide.body}</p>
      </div>
    </div>
  );
}

function SlideFrame({ slide }: { slide: CommunitySpotlightSlide }) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-1.5 px-3 py-2 sm:gap-2 sm:px-4 sm:py-2.5 md:gap-2.5 md:px-5 md:py-3")}>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary sm:text-xs">
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
  const [index, setIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSyncRef = useRef(true);
  const indexRef = useRef(0);

  useRealtimeRefresh({
    channel: "home-community-spotlight",
    subscriptions: [
      { table: "approved_daily_notes" },
      { table: "smruti_posts" },
      { table: "smruti_post_media" },
      { table: "swadhyay_posts" },
    ],
  });

  const safeIndex = slides.length === 0 ? 0 : Math.min(index, slides.length - 1);

  useLayoutEffect(() => {
    indexRef.current = safeIndex;
  }, [safeIndex]);

  useLayoutEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [slides.length]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const vp = viewportRef.current;
    if (!track || !vp || slides.length === 0) return;

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
      const track = trackRef.current;
      if (!track) return;
      gsap.set(track, { x: -indexRef.current * vp.offsetWidth });
    };

    const ro = new ResizeObserver(sync);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [slides.length]);

  if (slides.length === 0) return null;

  const current = slides[safeIndex] ?? slides[0];

  return (
    <section
      className="mx-auto w-full max-w-2xl space-y-2"
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
            className={cn("w-full overflow-hidden", VIEWPORT_H)}
            aria-roledescription="carousel"
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
        {current
          ? current.kind === "note"
            ? `Ghun for ${current.recipient_display_name.trim() || "community member"}.`
            : current.kind === "smruti"
              ? `Smruti by ${current.author_display_name.trim() || "member"}.`
              : `Swadhyay in ${current.topic_title}.`
          : null}
      </span>
    </section>
  );
}
