"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { Loader2 } from "lucide-react";
import { appNavItems } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";

// ─── IMPORTANT ───────────────────────────────────────────────────────────────
// Wrap {children} in your root layout to prevent content hiding under the nav.
// Keep the bottom padding just a touch above this nav's visible height so the
// body background isn't revealed as a blank band above the floating bar:
//
//   <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
//     {children}
//   </main>
// ─────────────────────────────────────────────────────────────────────────────

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const prevIndexRef = useRef<number>(-1);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    if (!pendingHref) return;
    const item = appNavItems.find((nav) => nav.href === pendingHref);
    if (item?.match(pathname)) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // ── Mount animation: slide up the whole bar ──────────────────────────────
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

      // Stagger each nav item in after the bar
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

  // ── Tab-switch animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (reduceMotionRef.current) return;
    const activeIndex = appNavItems.findIndex(({ match }) => match(pathname));
    if (activeIndex === -1) return;

    const prevIndex = prevIndexRef.current;
    prevIndexRef.current = activeIndex;

    // Bounce the tapped icon
    if (activeIndex !== prevIndex && itemRefs.current[activeIndex]) {
      gsap.fromTo(
        itemRefs.current[activeIndex],
        { scale: 0.94 },
        { scale: 1, duration: 0.2, ease: "power3.out" },
      );
    }

    // Subtle press-down on the previously active item
    if (prevIndex !== -1 && prevIndex !== activeIndex && itemRefs.current[prevIndex]) {
      gsap.fromTo(itemRefs.current[prevIndex], {
        scale: 1,
      }, {
        scale: 0.97,
        duration: 0.08,
        yoyo: true,
        repeat: 1,
        ease: "power1.out",
      });
    }
  }, [pathname]);

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
          // Fully opaque so the rounded top corners and edges don't reveal
          // the body background / app gradient behind the bar.
          "bg-card dark:bg-card",
          // Extra padding above iPhone home indicator for a larger touch band
          "pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.12)]",
        )}
      >
        {appNavItems.map(({ href, label, icon: Icon, match }, i) => {
          const active = match(pathname);
          const loading = pendingHref === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch
              scroll={false}
              ref={(el) => { itemRefs.current[i] = el; }}
              aria-current={active ? "page" : undefined}
              aria-busy={loading}
              onClick={(e) => {
                if (active) return;
                // Let the browser handle new-tab / modified clicks.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                setPendingHref(href);
                startTransition(() => {
                  router.push(href);
                });
              }}
              className={cn(
                "pointer-events-auto relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5",
                "transition-colors duration-[180ms] ease-[var(--ease-out-standard)] active:scale-[0.97] motion-reduce:active:scale-100",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                loading && "text-primary",
              )}
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                {loading ? (
                  <Loader2
                    className="size-[1.25rem] shrink-0 animate-spin text-primary"
                    aria-hidden
                  />
                ) : (
                  <Icon
                    className="size-[1.25rem]"
                    strokeWidth={active ? 2.5 : 2}
                    aria-hidden
                  />
                )}
              </span>

              <span className="text-[10px] font-semibold tracking-wide leading-none">
                {loading ? "Loading…" : label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}