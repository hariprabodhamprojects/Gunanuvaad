"use client";

import gsap from "gsap";
import { User } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { ApprovedSlide } from "@/lib/home/approved-slideshow";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 4000;
const SLIDE_DURATION = 0.28;
const SLIDE_EASE = "power3.out";

/** Square portrait tile — same proportions as roster mosaic tiles. */
const AVATAR_BOX = "size-[7.25rem] shrink-0 sm:size-32";
const NOTE_MAX_H = "max-h-[5.25rem] sm:max-h-24";

function SlideRow({ slide }: { slide: ApprovedSlide }) {
  const hasAvatar = slide.recipient_avatar_url.trim().length > 0;
  const label = slide.recipient_display_name.trim() || "Community member";

  return (
    <div
      className={cn(
        "flex min-h-[7.25rem] flex-row items-center gap-3 p-3 sm:min-h-32 sm:gap-4 sm:p-4",
      )}
    >
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-xl bg-muted/40",
          AVATAR_BOX,
        )}
      >
        {hasAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.recipient_avatar_url}
            alt=""
            className="size-full object-cover object-top"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <User className="size-12 opacity-60" strokeWidth={1.25} aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <p className="font-heading text-base font-semibold leading-tight text-foreground sm:text-lg">
          {label}
        </p>
        <div
          className={cn(
            NOTE_MAX_H,
            "overflow-y-auto overscroll-y-contain pr-1",
            "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent",
          )}
        >
          <p className="whitespace-pre-wrap text-base font-medium leading-relaxed text-foreground">
            {slide.body}
          </p>
        </div>
      </div>
    </div>
  );
}

type Props = {
  slides: ApprovedSlide[];
};

export function ApprovedNotesSlideshow({ slides }: Props) {
  const [index, setIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSyncRef = useRef(true);
  const indexRef = useRef(0);
  indexRef.current = index;

  useLayoutEffect(() => {
    setIndex((i) => (slides.length === 0 ? 0 : Math.min(i, slides.length - 1)));
  }, [slides.length]);

  useLayoutEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [slides.length]);

  /** PPT-style horizontal slide: track moves left so the next panel enters from the right. */
  useLayoutEffect(() => {
    const track = trackRef.current;
    const vp = viewportRef.current;
    if (!track || !vp || slides.length === 0) return;

    const w = vp.offsetWidth;
    if (w === 0) return;

    const x = -index * w;
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
  }, [index, slides]);

  /** Keep alignment when the viewport width changes (rotation, resize). */
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

  const current = slides[index] ?? slides[0];

  return (
    <section
      className="space-y-2"
      aria-label="Approved notes spotlight"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-center text-xs font-bold uppercase tracking-[0.15em] text-primary/80 drop-shadow-sm">
        Ghunos for each other
      </p>
      <div className="glass-card overflow-hidden transition-[transform,box-shadow,border-color] duration-[220ms] ease-[var(--ease-out-standard)]">
        <div className="p-0 relative">
          <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_right,var(--palette-bg-subtle)_0%,transparent_10%,transparent_90%,var(--palette-bg-subtle)_100%)] opacity-30 mix-blend-overlay" />
          <div
            ref={viewportRef}
            className="w-full overflow-hidden"
            aria-roledescription="carousel"
          >
            <div
              ref={trackRef}
              className="flex will-change-transform"
              style={{ width: `${slides.length * 100}%` }}
            >
              {slides.map((s) => (
                <div
                  key={s.note_id}
                  className="box-border shrink-0"
                  style={{ width: `${100 / slides.length}%` }}
                >
                  <SlideRow slide={s} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {slides.length > 1 ? (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Slide">
          {slides.map((s, i) => (
            <button
              key={s.note_id}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={cn(
                "size-2 rounded-full transition-[transform,background-color] duration-[180ms] ease-[var(--ease-out-standard)] active:scale-[0.97] motion-reduce:active:scale-100",
                i === index ? "bg-primary" : "bg-muted-foreground/25 hover:bg-muted-foreground/40",
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
      <span className="sr-only">
        {current
          ? `Showing ghun for ${current.recipient_display_name.trim() || "community member"}.`
          : null}
      </span>
    </section>
  );
}
