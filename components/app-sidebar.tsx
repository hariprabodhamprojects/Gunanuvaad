"use client";

import { AppNavLink } from "@/components/app-nav-link";
import { appNavItems } from "@/lib/navigation/app-nav";
import { useNavSelection } from "@/lib/navigation/use-nav-selection";
import { cn } from "@/lib/utils";

function SidebarNavItem({ item }: { item: (typeof appNavItems)[number] }) {
  const { isActive } = useNavSelection();
  const { label, icon: Icon } = item;
  const active = isActive(item);

  return (
    <AppNavLink
      item={item}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      inactiveClassName="border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/45 hover:text-foreground"
      activeClassName="border-primary/30 bg-primary/10 text-primary shadow-sm"
    >
      <Icon className="size-4 shrink-0" strokeWidth={active ? 2.4 : 2.1} aria-hidden />
      <span>{label}</span>
    </AppNavLink>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden lg:flex lg:w-[var(--app-sidebar-width)] lg:shrink-0">
      <div className="sticky top-0 flex h-full w-full flex-col border-r border-border/60 bg-card/35 px-3 py-5 xl:px-4">
        <nav className="space-y-1.5" aria-label="Primary navigation">
          {appNavItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} />
          ))}
        </nav>
      </div>
    </aside>
  );
}
