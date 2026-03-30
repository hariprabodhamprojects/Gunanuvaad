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
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-background bg-app-gradient px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]"
    >
      {/* Decorative 3D Spheres using CSS radial gradients */}
      <div className="pointer-events-none absolute -left-20 top-20 size-[30rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--palette-brand),transparent_60%)] opacity-30 blur-3xl mix-blend-screen" aria-hidden />
      <div className="pointer-events-none absolute -right-20 bottom-10 size-[35rem] rounded-full bg-[radial-gradient(circle_at_70%_70%,var(--palette-accent),transparent_70%)] opacity-20 blur-3xl mix-blend-screen" aria-hidden />

      <div className="glass-card relative z-10 flex w-full max-w-md flex-col items-center px-6 py-12 text-center shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
        {errorMessage ? (
          <p
            className="mb-8 w-full rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <div
          ref={iconRef}
          className="mb-8 flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/30 to-primary/5 p-1 shadow-[0_8px_32px_rgba(250,115,22,0.25)] ring-1 ring-white/20 sm:size-28"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="flex size-full items-center justify-center rounded-2xl bg-gradient-to-tr from-background/90 to-background/50 shadow-inner">
            <Sparkles className="size-12 text-primary drop-shadow-[0_0_15px_rgba(250,115,22,0.6)] sm:size-14" strokeWidth={1.25} aria-hidden />
          </div>
        </div>

        <h1
          ref={titleRef}
          className="font-heading text-4xl font-bold tracking-tight text-foreground drop-shadow-md sm:text-5xl"
        >
          Gunanuvad
        </h1>
        <p
          ref={subRef}
          className="mt-4 max-w-sm text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          One appreciation a day — keep the streak alive.
        </p>

        <div ref={ctaRef} className="mt-12 w-full max-w-sm">
          <Button
            type="button"
            size="lg"
            className={cn(
              "h-14 w-full rounded-2xl bg-gradient-to-b from-primary to-primary/80 text-lg font-semibold text-primary-foreground shadow-[0_8px_30px_rgba(250,115,22,0.3)] ring-1 ring-primary/50 transition-all duration-300",
              "hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(250,115,22,0.4)] hover:brightness-110 active:scale-[0.98]",
              introDone && "motion-safe:hover:-translate-y-1",
            )}
            disabled={pending}
            onClick={onGoogle}
          >
            {pending ? "Authenticating…" : "Continue with Google"}
          </Button>
          <p className="mt-6 text-center text-sm font-medium text-muted-foreground/80">
            Invite-only — use your permitted Google account.
          </p>
        </div>
      </div>
    </div>
  );
}
