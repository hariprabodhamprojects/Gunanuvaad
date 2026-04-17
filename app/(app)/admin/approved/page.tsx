import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovedNotesTable } from "@/components/admin/approved-notes-table";
import { fetchNotesForApproval } from "@/lib/admin/queries";

export const metadata = {
  title: "Approved notes — Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminApprovedNotesPage() {
  const rows = await fetchNotesForApproval(120);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary sm:text-3xl">Approved notes</h1>
      </header>

      <Card className="ring-border/60">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Recent notes (newest first)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ApprovedNotesTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
