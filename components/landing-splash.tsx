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

/**
 * Single entry: Netflix-style intro (~3s), then one primary sign-in action (no duplicate /login page).
 */
export function LandingSplash({ redirectNext, errorMessage }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const icon = iconRef.current;
    const title = titleRef.current;
    const sub = subRef.current;
    const cta = ctaRef.current;
    if (!root || !icon || !title || !sub || !cta) return;

    gsap.set([icon, title, sub], { opacity: 0 });
    gsap.set(icon, { scale: 0.72, y: 16 });
    gsap.set(title, { y: 28 });
    gsap.set(sub, { y: 12 });
    gsap.set(cta, { opacity: 0, y: 18, pointerEvents: "none" });

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => setIntroDone(true),
    });

    tl.to(icon, { opacity: 1, scale: 1, y: 0, duration: 0.88 }, 0)
      .to(title, { opacity: 1, y: 0, duration: 0.75 }, 0.2)
      .to(sub, { opacity: 1, y: 0, duration: 0.55 }, 0.45)
      // Hold on logo + title (~Netflix beat), then reveal the single CTA.
      .to(cta, { opacity: 1, y: 0, duration: 0.62, pointerEvents: "auto" }, "+=1.2");

    return () => {
      tl.kill();
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
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#0c0c0c] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_65%_at_50%_-5%,rgba(220,90,70,0.22),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_100%,rgba(255,255,255,0.04),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
        {errorMessage ? (
          <p
            className="mb-8 w-full rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <div
          ref={iconRef}
          className="mb-7 flex size-24 items-center justify-center rounded-3xl bg-primary/12 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ring-1 ring-white/10 sm:size-28"
        >
          <Sparkles className="size-12 text-primary sm:size-14" strokeWidth={1.25} aria-hidden />
        </div>

        <h1
          ref={titleRef}
          className="font-heading text-4xl font-semibold tracking-tight text-white sm:text-5xl"
        >
          Gunanuvad
        </h1>
        <p
          ref={subRef}
          className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base"
        >
          One appreciation a day — keep the streak alive.
        </p>

        <div ref={ctaRef} className="mt-12 w-full max-w-sm">
          <Button
            type="button"
            size="lg"
            className={cn(
              "h-12 w-full rounded-xl text-base font-semibold shadow-lg transition-[transform,box-shadow] duration-200",
              "hover:scale-[1.02] active:scale-[0.98]",
              introDone && "motion-safe:hover:shadow-xl",
            )}
            disabled={pending}
            onClick={onGoogle}
          >
            {pending ? "Redirecting…" : "Continue with Google"}
          </Button>
          <p className="mt-4 text-center text-xs text-zinc-500">
            Invite-only — use a Google account that&apos;s on the list.
          </p>
        </div>
      </div>
    </div>
  );
}
