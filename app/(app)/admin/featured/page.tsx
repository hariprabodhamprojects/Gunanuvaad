import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeaturedNotesTable } from "@/components/admin/featured-notes-table";
import { fetchNotesForFeature } from "@/lib/admin/queries";

export const metadata = {
  title: "Featured notes — Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminFeaturedPage() {
  const rows = await fetchNotesForFeature(120);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Featured notes</h1>
        <p className="text-sm text-muted-foreground">
          Feature or unfeature recent notes. Only adds or removes a row in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">featured_daily_notes</code> pointing at the original
          note. Points and streaks are unchanged.
        </p>
      </header>

      <Card className="ring-border/60">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Recent notes (newest first)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <FeaturedNotesTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
