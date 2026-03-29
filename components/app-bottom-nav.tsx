"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { BarChart2, Home, UserRound } from "lucide-react";
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
  { href: "/me", label: "Me", icon: UserRound, match: (p: string) => p === "/me" || p.startsWith("/me/") },
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
          "pointer-events-auto flex w-full max-w-lg items-stretch gap-0.5 sm:max-w-xl sm:gap-1",
          "glass-strong rounded-2xl border border-border/70 px-1.5 py-1.5 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.12)]",
          "dark:shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.45)]",
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
                "h-auto min-h-[3.25rem] flex-1 flex-col gap-0.5 rounded-xl py-1.5 text-[0.7rem] font-medium tracking-tight sm:text-xs",
                "text-muted-foreground transition-[color,background-color,transform] duration-200",
                "hover:bg-muted/60 hover:text-foreground",
                "active:scale-[0.97]",
                active &&
                  "bg-primary/12 font-semibold text-primary shadow-sm dark:bg-primary/18 dark:text-primary",
              )}
            >
              <Icon className={cn("size-5 sm:size-[1.35rem]", active ? "opacity-100" : "opacity-70")} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
