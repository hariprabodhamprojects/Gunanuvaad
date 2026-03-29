"use client";

import gsap from "gsap";
import { User } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ApprovedSlide } from "@/lib/home/approved-slideshow";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 5000;

/** Square portrait tile — same proportions as roster cards (`aspect-square` on mosaic tiles). */
const AVATAR_BOX = "size-[7.25rem] shrink-0 sm:size-32";
/** Scroll cap for long notes; keeps carousel cards from growing without bound. */
const NOTE_MAX_H = "max-h-[5.25rem] sm:max-h-24";

type Props = {
  slides: ApprovedSlide[];
};

export function ApprovedNotesSlideshow({ slides }: Props) {
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setIndex((i) => (slides.length === 0 ? 0 : Math.min(i, slides.length - 1)));
  }, [slides.length]);

  const slide = slides[index] ?? null;

  useLayoutEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [slides.length]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || !slide) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", overwrite: "auto" },
      );
    }, el);
    return () => ctx.revert();
  }, [slide?.note_id, slide]);

  if (slides.length === 0 || !slide) return null;

  const hasAvatar = slide.recipient_avatar_url.trim().length > 0;
  const label =
    slide.recipient_display_name.trim() || "Community member";

  return (
    <section
      className="space-y-2"
      aria-label="Approved notes spotlight"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
        Notes for each other
      </p>
      <Card className="overflow-hidden ring-border/60">
        <CardContent className="p-0">
          <div
            ref={cardRef}
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
        </CardContent>
      </Card>
      {slides.length > 1 ? (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Slide">
          {slides.map((s, i) => (
            <button
              key={s.note_id}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={cn(
                "size-2 rounded-full transition-colors",
                i === index ? "bg-primary" : "bg-muted-foreground/25 hover:bg-muted-foreground/40",
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
