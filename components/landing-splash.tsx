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

    // Immersive 3D Tilt Effect on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      if (!ctaRef.current) return;
      const card = ctaRef.current.parentElement;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      gsap.to(card, {
        rotationY: x / 25,
        rotationX: -y / 25,
        ease: "power2.out",
        transformPerspective: 1000,
        transformOrigin: "center center"
      });
    };
    
    const handleMouseLeave = () => {
      if (!ctaRef.current) return;
      const card = ctaRef.current.parentElement;
      if (!card) return;
      gsap.to(card, {
        rotationY: 0,
        rotationX: 0,
        ease: "power3.out",
        duration: 0.8
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    root.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      root.removeEventListener("mouseleave", handleMouseLeave);
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
      style={{ perspective: "1500px" }}
    >
      {/* Decorative 3D Spheres using CSS radial gradients */}
      <div className="animate-float-3d pointer-events-none absolute -left-20 top-20 size-[30rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--palette-brand),transparent_60%)] opacity-30 blur-3xl mix-blend-screen" aria-hidden />
      <div className="animate-float-3d pointer-events-none absolute -right-20 bottom-10 size-[35rem] rounded-full bg-[radial-gradient(circle_at_70%_70%,var(--palette-accent),transparent_70%)] opacity-20 blur-3xl mix-blend-screen" aria-hidden style={{ animationDelay: '2s' }} />

      <div 
        className="glass-card relative z-10 flex w-full max-w-md flex-col items-center px-6 py-12 text-center shadow-2xl transition-all duration-300 transform-gpu"
        style={{ transformStyle: "preserve-3d" }}
      >
        {errorMessage ? (
          <p
            className="mb-8 w-full rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-[0_0_15px_rgba(255,0,0,0.3)] animate-pulse"
            role="alert"
            style={{ transform: "translateZ(30px)" }}
          >
            {errorMessage}
          </p>
        ) : null}

        <div
          ref={iconRef}
          className="mb-8 flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/50 to-primary/10 p-1 shadow-[0_15px_40px_rgba(250,115,22,0.6)] ring-1 ring-white/30 sm:size-28 animate-neon-pulse"
          style={{ transform: "translateZ(60px)", transformStyle: "preserve-3d" }}
        >
          <div className="flex size-full items-center justify-center rounded-2xl bg-gradient-to-tr from-background/90 to-background/50 shadow-inner">
            <Sparkles className="size-12 text-primary drop-shadow-[0_0_20px_rgba(250,115,22,0.9)] sm:size-14 animate-float-3d" strokeWidth={1.5} aria-hidden />
          </div>
        </div>

        <h1
          ref={titleRef}
          className="font-heading text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-foreground to-primary/80 drop-shadow-[0_5px_15px_rgba(250,115,22,0.4)] sm:text-6xl uppercase italic"
          style={{ transform: "translateZ(40px)" }}
        >
          Gunanuvad
        </h1>
        <p
          ref={subRef}
          className="mt-4 max-w-sm text-pretty text-base font-medium leading-relaxed text-muted-foreground/90 sm:text-lg"
          style={{ transform: "translateZ(25px)" }}
        >
          One appreciation a day — keep the streak alive.
        </p>

        <div ref={ctaRef} className="mt-12 w-full max-w-sm" style={{ transform: "translateZ(50px)" }}>
          <Button
            type="button"
            size="lg"
            className={cn(
              "relative h-16 w-full rounded-2xl bg-gradient-to-b from-primary to-primary/70 text-xl font-bold text-primary-foreground overflow-hidden",
              "border-t border-white/40 shadow-[0_8px_0_rgba(180,60,0,1),0_15px_30px_rgba(250,115,22,0.4)] transition-all duration-200",
              "hover:translate-y-1 hover:shadow-[0_4px_0_rgba(180,60,0,1),0_8px_20px_rgba(250,115,22,0.3)] hover:brightness-110",
              "active:translate-y-2 active:shadow-[0_0px_0_rgba(180,60,0,1),0_0px_10px_rgba(250,115,22,0.2)]",
              introDone && "motion-safe:hover:-rotate-1",
            )}
            disabled={pending}
            onClick={onGoogle}
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shine_3s_infinite]" />
            <span className="relative z-10 flex items-center justify-center drop-shadow-md">
              {pending ? "Authenticating…" : "PLAY NOW"}
            </span>
          </Button>
          <p className="mt-6 text-center text-sm font-semibold tracking-wide text-primary/70 uppercase">
            Invite-only access
          </p>
        </div>
      </div>
    </div>
  );
}
