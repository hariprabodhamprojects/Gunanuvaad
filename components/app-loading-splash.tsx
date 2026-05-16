"use client";

import { useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { motion, useReducedMotion } from "motion/react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PORTAL_ID = "app-min-loading-splash-portal";
const MIN_MS = 3000;

const easeLux: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Module state survives React fast-unmount of `loading.tsx` so we can honor MIN_MS. */
let sessionT0: number | null = null;
let portalEl: HTMLDivElement | null = null;
let portalRoot: Root | null = null;
let teardownTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleTeardown() {
  if (sessionT0 === null) return;
  if (teardownTimer) clearTimeout(teardownTimer);
  const rem = Math.max(0, MIN_MS - (Date.now() - sessionT0));
  teardownTimer = setTimeout(() => {
    teardownTimer = null;
    portalRoot?.unmount();
    portalRoot = null;
    portalEl?.remove();
    portalEl = null;
    sessionT0 = null;
    document.body.style.overflow = "";
  }, rem);
}

function SplashVisual({ reduceMotion }: { reduceMotion: boolean }) {
  const logoTransition = reduceMotion
    ? { duration: 0.25 }
    : { type: "spring" as const, stiffness: 88, damping: 26, mass: 1.15 };

  const barTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 2.85, repeat: Infinity, ease: "linear" as const };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex min-h-dvh w-full flex-col bg-app-gradient text-foreground"
      initial={false}
    >
      <span className="sr-only">Loading MananChintan</span>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={
            reduceMotion ? { duration: 0.28 } : { duration: 1.22, ease: easeLux }
          }
          className="relative w-full max-w-sm"
        >
          {!reduceMotion ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-10 rounded-[2.75rem] bg-primary/12 blur-3xl"
              animate={{ opacity: [0.45, 0.75, 0.45], scale: [0.98, 1.04, 0.98] }}
              transition={{ duration: 4.25, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}

          <Card
            className={cn(
              "glass-card relative border-border/70 bg-card/85 py-9 shadow-[0_20px_60px_-24px_color-mix(in_oklch,var(--foreground)_12%,transparent)]",
              "ring-1 ring-border/40 backdrop-blur-md",
            )}
          >
            <div className="flex flex-col items-center gap-7 px-6">
              <motion.div
                initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={logoTransition}
                className="relative flex size-28 items-center justify-center overflow-hidden rounded-3xl border border-border/80 bg-muted/40 shadow-inner sm:size-32"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt=""
                  className="size-[78%] object-contain drop-shadow-[0_10px_28px_color-mix(in_oklch,var(--foreground)_14%,transparent)]"
                />
              </motion.div>

              <motion.div className="flex flex-col items-center gap-2 text-center">
                <motion.p
                  className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0.22 }
                      : { delay: 0.7, duration: 1.05, ease: easeLux }
                  }
                >
                  MananChintan
                </motion.p>
                <motion.p
                  className="text-sm font-medium tracking-[0.18em] text-primary sm:text-base"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0.22 }
                      : { delay: 1.65, duration: 1.05, ease: easeLux }
                  }
                >
                  મનન ચિંતન
                </motion.p>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 w-full pb-[env(safe-area-inset-bottom,0px)]">
        <div className="h-[3px] w-full overflow-hidden bg-muted sm:h-1">
          <div className="h-full w-full bg-border/50">
            {reduceMotion ? (
              <div className="h-full w-full bg-primary/60" />
            ) : (
              <motion.div
                className="h-full w-[38%] bg-gradient-to-r from-transparent via-primary to-transparent opacity-90"
                initial={{ x: "-130%" }}
                animate={{ x: "340%" }}
                transition={barTransition}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SplashPortalInner() {
  const reduceMotion = useReducedMotion() ?? false;
  return <SplashVisual reduceMotion={reduceMotion} />;
}

/**
 * Full-screen splash (portal + min 3s): cold start via root `app/loading.tsx` only.
 * In-app tab navigations do not show a splash.
 */
export function AppLoadingSplash() {
  useLayoutEffect(() => {
    if (teardownTimer) {
      clearTimeout(teardownTimer);
      teardownTimer = null;
    }
    sessionT0 = Date.now();

    let el = document.getElementById(PORTAL_ID) as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = PORTAL_ID;
      document.body.appendChild(el);
    }
    portalEl = el;
    portalRoot?.unmount();
    portalRoot = createRoot(el);

    document.body.style.overflow = "hidden";
    portalRoot.render(<SplashPortalInner key={sessionT0} />);

    return () => {
      scheduleTeardown();
    };
  }, []);

  return <span className="sr-only">Loading MananChintan</span>;
}
