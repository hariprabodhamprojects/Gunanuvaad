"use client";

import { motion, useReducedMotion } from "motion/react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Full-route loading shell — Netflix-style: dark canvas, centered mark + wordmark,
 * bottom indeterminate progress. Respects `prefers-reduced-motion`.
 */
export function AppLoadingSplash() {
  const reduceMotion = useReducedMotion() ?? false;

  const logoTransition = reduceMotion
    ? { duration: 0.2 }
    : { type: "spring" as const, stiffness: 260, damping: 22, mass: 0.8 };

  const barTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 1.35, repeat: Infinity, ease: "linear" as const };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex min-h-dvh flex-col bg-zinc-950 text-zinc-50",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_55%)]",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(120%_80%_at_50%_120%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_50%)]",
      )}
    >
      <span className="sr-only">Loading MananChintan</span>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0.25 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm"
        >
          {!reduceMotion ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-primary/25 blur-3xl"
              animate={{ opacity: [0.35, 0.6, 0.35], scale: [0.96, 1.02, 0.96] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}

          <Card
            className={cn(
              "relative border-white/10 bg-zinc-900/55 py-8 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-xl",
              "ring-1 ring-white/10",
            )}
          >
            <div className="flex flex-col items-center gap-6 px-6">
              <motion.div
                initial={reduceMotion ? false : { scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={logoTransition}
                className="relative flex size-28 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-zinc-950/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:size-32"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt=""
                  className="size-[78%] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                />
              </motion.div>

              <div className="flex flex-col items-center gap-1.5 text-center">
                <motion.p
                  className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduceMotion ? { duration: 0.2 } : { delay: 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }
                  }
                >
                  MananChintan
                </motion.p>
                <motion.p
                  className="text-sm font-medium tracking-[0.2em] text-primary/90 sm:text-base"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduceMotion ? { duration: 0.2 } : { delay: 0.22, duration: 0.4, ease: [0.22, 1, 0.36, 1] }
                  }
                >
                  મનન ચિંતન
                </motion.p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Netflix-style bottom progress strip (sits above home indicator). */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="h-[3px] w-full overflow-hidden bg-zinc-800/90 sm:h-1">
          <div className="h-full w-full bg-zinc-800/50">
            {reduceMotion ? (
              <div className="h-full w-full bg-primary/70" />
            ) : (
              <motion.div
                className="h-full w-[42%] bg-gradient-to-r from-transparent via-primary to-transparent opacity-95"
                initial={{ x: "-120%" }}
                animate={{ x: "320%" }}
                transition={barTransition}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
