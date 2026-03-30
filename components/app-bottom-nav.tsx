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
          "pointer-events-auto flex w-full max-w-lg items-stretch gap-1 sm:max-w-xl md:gap-2",
          "glass-strong rounded-3xl border border-white/20 px-2 py-2 shadow-sm backdrop-blur-2xl",
          "dark:border-white/10 dark:shadow-md transform-gpu",
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
                "relative h-auto min-h-[3.5rem] flex-1 flex-col gap-1 rounded-2xl py-2 text-[10px] sm:text-xs font-medium overflow-hidden",
                "text-muted-foreground transition-all duration-300",
                "hover:bg-muted/50 hover:text-foreground",
                "active:scale-95",
                active &&
                  "text-primary font-bold bg-primary/10 shadow-sm",
              )}
            >
              {active && (
                <div className="absolute inset-x-4 -bottom-1 h-3 rounded-t-full bg-primary/20 blur-md" aria-hidden />
              )}
              <Icon className={cn("relative z-10 size-5 sm:size-6 transition-transform", active ? "scale-105" : "opacity-80")} aria-hidden />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
