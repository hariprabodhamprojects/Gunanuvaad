import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAllowlistOverview } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

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
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Invite list</h1>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <Card className="ring-border/50">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Invited</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <p className="font-heading text-2xl font-semibold tabular-nums">{total}</p>
          </CardContent>
        </Card>
        <Card className="ring-border/50">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Signed up</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <p className="font-heading text-2xl font-semibold tabular-nums">{signedUp}</p>
          </CardContent>
        </Card>
        <Card className="ring-border/50">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Roster-ready</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <p className="font-heading text-2xl font-semibold tabular-nums">{rosterReady}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden ring-border/60">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">All invites</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium sm:px-4">Email</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Invite name</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Status</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Profile</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Org</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No rows returned. Run the new admin migration and ensure you are an organizer.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.email} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2.5 font-mono text-xs sm:px-4 sm:text-sm">{r.email}</td>
                      <td className="max-w-[10rem] truncate px-3 py-2.5 text-muted-foreground sm:px-4">
                        {r.invite_display_name?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            r.has_signed_up
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {r.has_signed_up ? "Signed up" : "Not yet"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            r.roster_ready
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {r.roster_ready ? "Roster-ready" : "Incomplete"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        {r.is_organizer ? (
                          <span className="text-xs font-medium text-primary">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
