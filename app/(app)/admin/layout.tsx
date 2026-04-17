import Link from "next/link";
import { requireOrganizer } from "@/lib/auth/require-organizer";
import { cn } from "@/lib/utils";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireOrganizer();

  const links = [
    { href: "/admin/invites", label: "Invites" },
    { href: "/admin/approved", label: "Approved notes" },
    { href: "/admin/swadhyay", label: "Swadhyay" },
    { href: "/admin/exports", label: "Ghunos export" },
  ] as const;

  return (
    <div className="layout-wide space-y-6">
      <nav
        className={cn(
          "flex items-center gap-1.5 border-b border-border/60 pb-3",
          // Keep all tabs on one line; allow horizontal scroll on narrow screens.
          "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
