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
  const [pending, setPending] = useState(false);

  useLayoutEffect(() => {
    const icon = iconRef.current;
    const title = titleRef.current;
    const cta = ctaRef.current;
    if (!icon || !title || !cta) return;

    gsap.set([icon, title, cta], { opacity: 0, y: 15 });

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.delay(0.2)
      .to(icon, { opacity: 1, y: 0, duration: 0.8 })
      .to(title, { opacity: 1, y: 0, duration: 0.8 }, "-=0.6")
      .to(cta, { opacity: 1, y: 0, duration: 0.8 }, "-=0.4");

    return () => { tl.kill(); };
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
          className="font-heading text-[2.85rem] font-normal tracking-tight text-primary/80 sm:text-[3.2rem]"
        >
          MananChintan
        </h1>

        <div ref={ctaRef} className="mt-10 w-full">
          <Button
            type="button"
            size="lg"
            className="h-14 w-full rounded-xl text-lg font-medium shadow-sm transition-transform active:scale-95"
            disabled={pending}
            onClick={onGoogle}
          >
            {pending ? "Authenticating…" : "Continue with Google"}
          </Button>
          <p className="mt-4 text-center text-base font-medium text-primary/80 sm:text-[1.05rem]">
            તારે લઈ ને હું, હું તો નિમિત માત્ર.
          </p>
        </div>
      </div>
    </div>
  );
}
