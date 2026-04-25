"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";

import { createHeroEnterTransition, getHeroInitial } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  children: ReactNode;
};

const heroSurface =
  "page-hero rounded-3xl border border-border/60 bg-card/70 px-5 py-5 shadow-sm transition-shadow duration-[var(--motion-base)] ease-[var(--ease-out-standard)] hover:shadow-md sm:px-7";

/**
 * Server pages keep their RSC boundary; this client wrapper only animates
 * the hero `header` on first paint. Respects `prefers-reduced-motion`.
 */
export function MotionPageHero({ className, children }: Props) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <motion.header
      className={cn(heroSurface, className)}
      initial={getHeroInitial(reduceMotion)}
      animate={{ opacity: 1, y: 0 }}
      transition={createHeroEnterTransition(reduceMotion)}
    >
      {children}
    </motion.header>
  );
}
