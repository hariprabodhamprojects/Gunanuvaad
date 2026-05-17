import { AdminInvitesList } from "@/components/admin/admin-invites-list";
import { AdminInvitesRealtime } from "@/components/admin/admin-invites-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAllowlistOverview } from "@/lib/admin/queries";

export const metadata = {
  title: "Invites — Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  const rows = await fetchAllowlistOverview();
  const total = rows.length;
  const signedUp = rows.filter((r) => r.has_signed_up).length;
  const rosterReady = rows.filter((r) => r.roster_ready).length;

  return (
    <div className="space-y-6">
      <AdminInvitesRealtime />
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary sm:text-3xl">Invite list</h1>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <Card className="ring-border/50">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Invited</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <p className="font-heading text-2xl font-semibold tabular-nums text-primary">{total}</p>
          </CardContent>
        </Card>
        <Card className="ring-border/50">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Signed up</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <p className="font-heading text-2xl font-semibold tabular-nums text-primary">{signedUp}</p>
          </CardContent>
        </Card>
        <Card className="ring-border/50">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Roster-ready</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <p className="font-heading text-2xl font-semibold tabular-nums text-primary">{rosterReady}</p>
          </CardContent>
        </Card>
      </div>

      <AdminInvitesList rows={rows} />
    </div>
  );
}
