"use client";

import { useLayoutEffect, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { BarChart2, CalendarDays, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/home",
    label: "Home",
    icon: Home,
    match: (p: string) => p === "/home" || p === "/" || p === "/pick",
  },
  {
    href: "/standings",
    label: "Standings",
    icon: BarChart2,
    match: (p: string) => p === "/standings" || p.startsWith("/standings/"),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    match: (p: string) => p === "/calendar" || p.startsWith("/calendar/"),
  },
] as const;

// ─── IMPORTANT ───────────────────────────────────────────────────────────────
// Wrap {children} in your root layout to prevent content hiding under the nav:
//
//   <main className="pb-[calc(3.25rem+env(safe-area-inset-bottom))]">
//     {children}
//   </main>
// ─────────────────────────────────────────────────────────────────────────────

export function AppBottomNav() {
  const pathname = usePathname() ?? "";
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const indicatorRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const prevIndexRef = useRef<number>(-1);

  // ── Mount animation: slide up the whole bar ──────────────────────────────
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 56, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, ease: "expo.out", delay: 0.1 },
      );

      // Stagger each nav item in after the bar
      gsap.fromTo(
        itemRefs.current,
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "back.out(1.8)",
          stagger: 0.08,
          delay: 0.35,
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  // ── Tab-switch animation ─────────────────────────────────────────────────
  useEffect(() => {
    const activeIndex = items.findIndex(({ match }) => match(pathname));
    if (activeIndex === -1) return;

    const prevIndex = prevIndexRef.current;
    prevIndexRef.current = activeIndex;

    // Animate the active indicator bar
    indicatorRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i === activeIndex) {
        gsap.fromTo(
          el,
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.4, ease: "expo.out" },
        );
      } else {
        gsap.to(el, { scaleX: 0, opacity: 0, duration: 0.25, ease: "power2.in" });
      }
    });

    // Bounce the tapped icon
    if (activeIndex !== prevIndex && itemRefs.current[activeIndex]) {
      gsap.fromTo(
        itemRefs.current[activeIndex],
        { scale: 0.85 },
        { scale: 1, duration: 0.45, ease: "back.out(2.5)" },
      );
    }

    // Subtle press-down on the previously active item
    if (prevIndex !== -1 && prevIndex !== activeIndex && itemRefs.current[prevIndex]) {
      gsap.to(itemRefs.current[prevIndex], {
        scale: 0.95,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut",
      });
    }
  }, [pathname]);

  return (
    <nav
      aria-label="Primary navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100]"
    >
      <div
        ref={panelRef}
        className={cn(
          "pointer-events-auto flex w-full items-center justify-around",
          "border-t border-white/20 dark:border-white/10",
          "bg-white/80 dark:bg-black/80 backdrop-blur-xl",
          "pb-[env(safe-area-inset-bottom)]",
          "shadow-[0_-4px_24px_rgba(0,0,0,0.08)]",
        )}
      >
        {items.map(({ href, label, icon: Icon, match }, i) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5",
                "h-[3.25rem] transition-colors duration-300 active:scale-95",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {/* Active indicator bar — animated by GSAP */}
              <span
                ref={(el) => { indicatorRefs.current[i] = el; }}
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-primary"
                style={{
                  opacity: active ? 1 : 0,
                  transform: `translateX(-50%) scaleX(${active ? 1 : 0})`,
                  transformOrigin: "center",
                }}
              />

              <Icon
                className="size-[1.2rem]"
                strokeWidth={active ? 2.5 : 2}
                aria-hidden
              />

              <span className="text-[10px] font-semibold tracking-wide leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}