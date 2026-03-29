"use client";

import gsap from "gsap";
import { User } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ApprovedSlide } from "@/lib/home/approved-slideshow";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 5000;

/** Total card height fixed so every slide matches; long notes scroll inside. */
const CARD_HEIGHT = "min-h-[17.5rem] h-[17.5rem] sm:min-h-[18.5rem] sm:h-[18.5rem]";
/** ~half the previous full-width square strip — short photo band. */
const IMAGE_STRIP_H = "h-24 sm:h-28";

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
      <Card
        className={cn(
          "flex flex-col overflow-hidden ring-border/60",
          CARD_HEIGHT,
        )}
      >
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div ref={cardRef} className="flex min-h-0 flex-1 flex-col">
            <div
              className={cn(
                "relative w-full shrink-0 overflow-hidden bg-muted/50",
                IMAGE_STRIP_H,
              )}
            >
              {hasAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.recipient_avatar_url}
                  alt=""
                  className="size-full object-cover object-center"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <User className="size-10 opacity-60" strokeWidth={1.25} aria-hidden />
                </div>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-4 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-3.5">
              <p className="shrink-0 font-heading text-base font-semibold leading-tight text-foreground sm:text-lg">
                {label}
              </p>
              <div
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1",
                  "[scrollbar-gutter:stable]",
                  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full",
                  "[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent",
                )}
              >
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground sm:text-base">
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
