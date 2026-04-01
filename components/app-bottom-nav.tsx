"use client";

import { useLayoutEffect, useRef } from "react";
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
// To stop page content from being hidden under the nav, wrap {children} in
// your root layout like this:
//
//   <main className="pb-[calc(3.25rem+env(safe-area-inset-bottom))]">
//     {children}
//   </main>
// ─────────────────────────────────────────────────────────────────────────────

export function AppBottomNav() {
  const pathname = usePathname() ?? "";
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 48, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "expo.out" },
      );
    }, el);
    return () => ctx.revert();
  }, []);

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
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex flex-1 flex-col items-center justify-center gap-0.5",
                "h-[3.25rem] transition-all duration-300 ease-out active:scale-95",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {/* Active indicator — thin bar at top edge */}
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-primary transition-all duration-300",
                  active ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0",
                )}
              />

              <Icon
                className="size-[1.2rem] transition-all duration-300 ease-out"
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