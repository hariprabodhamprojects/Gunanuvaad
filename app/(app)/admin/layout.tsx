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
          "flex flex-wrap items-center gap-2 border-b border-border/60 pb-3",
          // On phones, horizontal `overflow-x-auto` often eats the first touch
          // as a scroll gesture — wrap tabs instead so each tap is a real tap.
          "sm:flex-nowrap sm:gap-1.5 sm:overflow-x-auto sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden",
        )}
      >
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            prefetch
            scroll={false}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors",
              "active:bg-muted/80 hover:bg-muted hover:text-foreground",
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
