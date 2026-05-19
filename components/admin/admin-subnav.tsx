"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/approved", label: "Approved notes" },
  { href: "/admin/swadhyay", label: "Swadhyay" },
  { href: "/admin/exports", label: "Ghunos export" },
] as const;

export function AdminSubnav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border/60 pb-3",
        "sm:flex-nowrap sm:gap-1.5 sm:overflow-x-auto sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden",
      )}
      aria-label="Admin sections"
    >
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            prefetch
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-primary/12 text-primary ring-1 ring-primary/25"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
