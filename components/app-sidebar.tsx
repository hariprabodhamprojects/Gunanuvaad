"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavItems } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="hidden lg:flex lg:w-[var(--app-sidebar-width)] lg:shrink-0">
      <div className="sticky top-0 flex h-full w-full flex-col border-r border-border/60 bg-card/35 px-3 py-5 xl:px-4">
        <nav className="space-y-1.5" aria-label="Primary navigation">
          {appNavItems.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active
                    ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
                    : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/45 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" strokeWidth={active ? 2.4 : 2.1} aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
