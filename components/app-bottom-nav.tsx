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
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "expo.out",
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] drop-shadow-2xl"
      aria-label="Primary navigation"
    >
      <div
        ref={panelRef}
        className={cn(
          "pointer-events-auto flex w-full max-w-[320px] items-center justify-around gap-1",
          "rounded-full border border-white/20 bg-white/70 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-black/70",
        )}
      >
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex h-[3.5rem] w-20 flex-col items-center justify-center rounded-full transition-all duration-500 ease-out",
                active
                  ? "bg-primary/10 text-primary"
                  : "bg-transparent text-muted-foreground hover:text-foreground active:scale-95",
              )}
            >
              <div className="relative z-10 flex flex-col items-center justify-center">
                <Icon
                  className={cn(
                    "transition-all duration-500 ease-out",
                    active ? "size-5 -translate-y-[2px]" : "size-6 group-hover:-translate-y-1",
                  )}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />

                <span
                  className={cn(
                    "pointer-events-none absolute text-[10px] font-bold tracking-wide transition-all duration-500 ease-out",
                    active ? "translate-y-[12px] opacity-100" : "translate-y-[20px] opacity-0",
                  )}
                >
                  {label}
                </span>

                {/* Glowing active dot */}
                <div
                  className={cn(
                    "absolute -bottom-[20px] h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_2px_rgba(250,115,22,0.6)] transition-all duration-500 ease-out",
                    active ? "scale-100 opacity-100" : "scale-0 opacity-0",
                  )}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}