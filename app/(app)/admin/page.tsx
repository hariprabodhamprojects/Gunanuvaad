import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Admin — Gunanuvad",
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Organizer tools: invite onboarding status and approved notes for the home spotlight (no effect on points or
          streaks).
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/invites" className="block rounded-xl transition-opacity hover:opacity-95">
          <Card className="h-full ring-border/60">
            <CardHeader>
              <CardTitle className="text-base">Invites</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              See who from <code className="rounded bg-muted px-1 py-0.5 text-xs">allowed_emails</code> has signed up
              and completed a roster-ready profile.
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/approved" className="block rounded-xl transition-opacity hover:opacity-95">
          <Card className="h-full ring-border/60">
            <CardHeader>
              <CardTitle className="text-base">Approved notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Approve notes for the home carousel. Pointers live in{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">approved_daily_notes</code>; scores are unchanged.
            </CardContent>
          </Card>
        </Link>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/home" className="text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
