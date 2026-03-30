"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { BarChart2, CalendarDays, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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
        { y: 28, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.42,
          ease: "power3.out",
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Primary navigation"
    >
      <div
        ref={panelRef}
        className={cn(
          "pointer-events-auto flex w-full max-w-lg items-stretch gap-1 sm:max-w-xl sm:gap-2",
          "glass-strong rounded-3xl border border-white/20 px-2 py-2 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] backdrop-blur-2xl",
          "dark:border-white/10 dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]",
        )}
      >
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "relative h-auto min-h-[3.5rem] flex-1 flex-col gap-1 rounded-2xl py-2 text-[10px] sm:text-xs font-medium tracking-tight overflow-hidden",
                "text-muted-foreground transition-all duration-300",
                "hover:bg-muted/50 hover:text-foreground",
                "active:scale-95",
                active &&
                  "text-primary font-bold bg-primary/10 shadow-[inset_0_2px_10px_rgba(250,115,22,0.1)]",
              )}
            >
              {active && (
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-50" aria-hidden />
              )}
              <Icon className={cn("relative z-10 size-5 sm:size-6 transition-transform duration-300 ease-out", active ? "scale-110 drop-shadow-[0_2px_8px_rgba(250,115,22,0.5)]" : "opacity-80")} aria-hidden />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
