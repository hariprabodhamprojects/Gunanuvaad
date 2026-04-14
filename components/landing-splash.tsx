"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startGoogleOAuth } from "@/lib/auth/google-oauth-client";
import { cn } from "@/lib/utils";

type Props = {
  redirectNext: string;
  errorMessage: string | null;
};

export function LandingSplash({ redirectNext, errorMessage }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);

  useLayoutEffect(() => {
    const icon = iconRef.current;
    const title = titleRef.current;
    const cta = ctaRef.current;
    const quote = quoteRef.current;
    if (!icon || !title || !cta || !quote) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      gsap.set([icon, title, cta, quote], { opacity: 1, y: 0, scale: 1 });
      return;
    }

    gsap.set([icon, title, cta, quote], { opacity: 0, y: 10 });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.delay(0.08)
      .to(icon, { opacity: 1, y: 0, duration: 0.24 })
      .to(title, { opacity: 1, y: 0, duration: 0.24 }, "-=0.14")
      .to(cta, { opacity: 1, y: 0, duration: 0.22 }, "-=0.1")
      .to(quote, { opacity: 1, y: 0, duration: 0.2 }, "-=0.08");

    const pulse = gsap.to(quote, {
      y: -2,
      scale: 1.01,
      duration: 1.9,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    return () => {
      tl.kill();
      pulse.kill();
    };
  }, []);

  async function onGoogle() {
    setPending(true);
    const r = await startGoogleOAuth(redirectNext);
    setPending(false);
    if (!r.ok) toast.error(r.message);
  }

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-dvh w-full flex-col items-center justify-center bg-background bg-app-gradient px-6 py-12"
    >
      <div className="glass-card flex w-full max-w-sm flex-col items-center px-8 py-14 text-center">
        {errorMessage ? (
          <p
            className="mb-8 w-full rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <div ref={iconRef} className="relative mb-6 flex size-24 sm:size-28 items-center justify-center rounded-[2rem] bg-card border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.png" 
            alt="MananChintan Logo"
            className="size-full object-contain"
          />
        </div>

        <h1
          ref={titleRef}
          className="whitespace-nowrap font-heading text-[2.4rem] font-normal tracking-tight text-primary sm:text-[2.7rem]"
        >
          મનન ચિંતન
        </h1>

        <div ref={ctaRef} className="mt-10 w-full">
          <Button
            type="button"
            size="lg"
            className="h-14 w-full rounded-xl text-lg font-medium shadow-sm active:scale-[0.97] motion-reduce:active:scale-100"
            disabled={pending}
            onClick={onGoogle}
          >
            {pending ? "પ્રમાણીકરણ ચાલી રહ્યું છે…" : "Google સાથે આગળ વધો"}
          </Button>
          <div
            ref={quoteRef}
            className={cn(
              "mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20",
              "bg-primary/10 px-4 py-2 text-sm font-semibold text-primary sm:text-base",
              "shadow-[0_4px_16px_rgba(250,115,22,0.16)]",
            )}
            role="note"
            aria-label="Daily spiritual line"
          >
            <Sparkles className="size-4 shrink-0" aria-hidden />
            <span>તારે લઈને હું, હું તો નિમિત માત્ર!</span>
            <span aria-hidden>✨</span>
          </div>
        </div>
      </div>
    </div>
  );
}
