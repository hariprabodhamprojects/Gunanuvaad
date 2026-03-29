import Link from "next/link";
import { requireOrganizer } from "@/lib/auth/require-organizer";

export const metadata = {
  title: "Admin — Gunanuvad",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireOrganizer();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Admin</h1>
        <p className="text-sm text-muted-foreground">Organizer-only area for managing the campaign.</p>
      </header>
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-12 text-center text-sm text-muted-foreground">
        <p className="mb-4">
          More tools (invites, roster insights, exports) can be added here in follow-up work.
        </p>
        <Link href="/home" className="text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
