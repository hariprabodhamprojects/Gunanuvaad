"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { AppNavLink } from "@/components/app-nav-link";
import { appNavItems } from "@/lib/navigation/app-nav";
import { useNavSelection } from "@/lib/navigation/use-nav-selection";
import { cn } from "@/lib/utils";

export function AppBottomNav() {
  const { isActive, activeIndex } = useNavSelection();
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const prevIndexRef = useRef<number>(-1);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (reduceMotionRef.current) {
      gsap.set(el, { y: 0, opacity: 1 });
      gsap.set(itemRefs.current, { y: 0, opacity: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.24, ease: "power3.out", delay: 0.04 },
      );
      gsap.fromTo(
        itemRefs.current,
        { y: 10, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.2,
          ease: "power2.out",
          stagger: 0.04,
          delay: 0.12,
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (reduceMotionRef.current) return;
    if (activeIndex === -1) return;

    const prevIndex = prevIndexRef.current;
    prevIndexRef.current = activeIndex;

    if (activeIndex !== prevIndex && itemRefs.current[activeIndex]) {
      gsap.fromTo(
        itemRefs.current[activeIndex],
        { scale: 0.94 },
        { scale: 1, duration: 0.2, ease: "power3.out" },
      );
    }

    if (prevIndex !== -1 && prevIndex !== activeIndex && itemRefs.current[prevIndex]) {
      gsap.fromTo(
        itemRefs.current[prevIndex],
        { scale: 1 },
        {
          scale: 0.97,
          duration: 0.08,
          yoyo: true,
          repeat: 1,
          ease: "power1.out",
        },
      );
    }
  }, [activeIndex]);

  return (
    <nav
      aria-label="Primary navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] lg:hidden"
    >
      <div
        ref={panelRef}
        className={cn(
          "pointer-events-none flex w-full items-stretch justify-around pt-1.5",
          "rounded-t-2xl border border-b-0 border-border/60",
          "bg-card dark:bg-card",
          "pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.12)]",
        )}
      >
        {appNavItems.map((item, i) => {
          const { label, icon: Icon } = item;
          const active = isActive(item);
          return (
            <AppNavLink
              key={item.href}
              item={item}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={cn(
                "pointer-events-auto relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5",
                "transition-colors duration-150 ease-[var(--ease-out-standard)] active:scale-[0.97] motion-reduce:active:scale-100",
              )}
              inactiveClassName="text-muted-foreground hover:text-foreground"
              activeClassName="text-primary"
            >
              <Icon
                className="size-[1.25rem]"
                strokeWidth={active ? 2.5 : 2}
                aria-hidden
              />
              <span className="text-[10px] font-semibold tracking-wide leading-none">{label}</span>
            </AppNavLink>
          );
        })}
      </div>
    </nav>
  );
}
