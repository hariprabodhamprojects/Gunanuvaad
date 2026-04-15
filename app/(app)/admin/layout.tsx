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
      <nav className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
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
