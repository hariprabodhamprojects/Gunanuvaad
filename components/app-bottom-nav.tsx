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

export function AppBottomNav() {
  const pathname = usePathname() ?? "";
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "back.out(1.2)",
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
      aria-label="Primary navigation"
    >
      <div
        ref={panelRef}
        className={cn(
          "pointer-events-auto flex w-full max-w-sm items-center justify-around gap-2",
          "glass-strong rounded-full border border-border px-2 py-2 shadow-lg backdrop-blur-3xl"
        )}
      >
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-full py-2.5 transition-all duration-300",
                "hover:text-foreground text-muted-foreground",
                active ? "text-primary" : "active:scale-95"
              )}
            >
              {active && (
                <div className="absolute inset-0 bg-primary/10 rounded-full" aria-hidden />
              )}
              <Icon
                className={cn(
                  "relative z-10 size-5 transition-transform duration-300",
                  active ? "scale-110" : ""
                )}
                strokeWidth={active ? 2.5 : 2}
                aria-hidden
              />
              <span
                className={cn(
                  "relative z-10 text-[10px] sm:text-xs font-semibold",
                  active ? "" : "font-medium"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
