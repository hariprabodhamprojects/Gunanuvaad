"use client";

import gsap from "gsap";
import { User } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ApprovedSlide } from "@/lib/home/approved-slideshow";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 5000;

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
      <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Notes for each other
      </p>
      <Card className="overflow-hidden ring-border/60">
        <CardContent className="p-0">
          <div ref={cardRef} className="flex flex-col sm:flex-row sm:items-stretch">
            <div className="relative aspect-square w-full shrink-0 bg-muted/40 sm:max-w-[11rem] md:max-w-[13rem]">
              {hasAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.recipient_avatar_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <User className="size-14 opacity-50" strokeWidth={1.25} aria-hidden />
                </div>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 px-4 py-4 sm:px-5 sm:py-5">
              <p className="font-heading text-sm font-semibold text-foreground">{label}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {slide.body}
              </p>
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
