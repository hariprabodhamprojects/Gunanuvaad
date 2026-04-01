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
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);

  useLayoutEffect(() => {
    const icon = iconRef.current;
    const title = titleRef.current;
    const sub = subRef.current;
    const cta = ctaRef.current;
    if (!icon || !title || !sub || !cta) return;

    gsap.set([icon, title, sub, cta], { opacity: 0, y: 15 });

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.delay(0.2)
      .to(icon, { opacity: 1, y: 0, duration: 0.8 })
      .to(title, { opacity: 1, y: 0, duration: 0.8 }, "-=0.6")
      .to(sub, { opacity: 1, y: 0, duration: 0.8 }, "-=0.6")
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
            alt="Gunanuvad Logo"
            className="size-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement?.classList.add('fallback-logo-landing');
            }}
          />
          <style dangerouslySetInnerHTML={{ __html: `
            .fallback-logo-landing::after {
              content: "G";
              font-size: 3.5rem;
              font-family: inherit;
              font-weight: 800;
              color: hsl(var(--primary));
            }
          `}} />
        </div>

        <h1
          ref={titleRef}
          className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
        >
          Gunanuvad
        </h1>
        <p
          ref={subRef}
          className="mt-3 text-base text-muted-foreground"
        >
          One appreciation a day — keep the streak alive.
        </p>

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
          <p className="mt-5 text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">
            Invite-only access
          </p>
        </div>
      </div>
    </div>
  );
}
