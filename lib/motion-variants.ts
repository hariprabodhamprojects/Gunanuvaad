import type { Variants } from "motion/react";

/** One-shot hero entrance: opacity + translateY only. */
const HERO_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const HERO_SEC = 0.24;
const STAGGER_EACH = 0.04;
const STAGGER_DELAY = 0.02;
const ITEM_SEC = 0.22;
const ITEM_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function createHeroEnterTransition(reduceMotion: boolean) {
  if (reduceMotion) {
    return { duration: 0 } as const;
  }
  return { duration: HERO_SEC, ease: HERO_EASE } as const;
}

export function getHeroInitial(reduceMotion: boolean) {
  if (reduceMotion) {
    return { opacity: 1, y: 0 };
  }
  return { opacity: 0, y: 8 };
}

export function createRosterStagger(reduceMotion: boolean): { container: Variants; item: Variants } {
  if (reduceMotion) {
    return {
      container: {
        hidden: {},
        show: { transition: { staggerChildren: 0, delayChildren: 0 } },
      },
      item: { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0, transition: { duration: 0 } } },
    };
  }
  return {
    container: {
      hidden: {},
      show: {
        transition: {
          staggerChildren: STAGGER_EACH,
          delayChildren: STAGGER_DELAY,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 8 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: ITEM_SEC, ease: ITEM_EASE },
      },
    },
  };
}
