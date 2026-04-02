import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GhunosCopyBox } from "@/components/admin/ghunos-copy-box";
import { fetchGhunosForRecipientExport } from "@/lib/admin/queries";

export const metadata = {
  title: "Ghunos export — Admin",
};

export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  from?: string;
  to?: string;
  limit?: string;
};

function makeReportText(rows: Awaited<ReturnType<typeof fetchGhunosForRecipientExport>>) {
  return rows.map((r) => r.body.trim()).join("\n\n");
}

export default async function AdminGhunosExportPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const from = (sp.from ?? "").trim();
  const to = (sp.to ?? "").trim();
  const limit = Number(sp.limit ?? "1000");
  const lim = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 2000) : 1000;

  const rows = q
    ? await fetchGhunosForRecipientExport({
        recipientQuery: q,
        from: from || undefined,
        to: to || undefined,
        limit: lim,
      })
    : [];

  const reportText = makeReportText(rows);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Ghunos export</h1>
      </header>

      <Card className="ring-border/60">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form method="get" className="grid gap-3 sm:grid-cols-4">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Recipient name or email"
              className="h-10 rounded-lg border border-border/70 bg-background px-3 text-sm sm:col-span-2"
            />
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="h-10 rounded-lg border border-border/70 bg-background px-3 text-sm"
            />
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="h-10 rounded-lg border border-border/70 bg-background px-3 text-sm"
            />
            <input type="hidden" name="limit" value={String(lim)} />
            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground sm:col-span-1"
            >
              Export
            </button>
          </form>
        </CardContent>
      </Card>

      {!q ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
          Enter a recipient name/email and click Export.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
          No ghunos found for that filter.
        </p>
      ) : (
        <>
          <Card className="ring-border/60">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base">Copy-ready text ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <GhunosCopyBox text={reportText} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden ring-border/60">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base">Preview table</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2.5 font-medium sm:px-4">Date</th>
                      <th className="px-3 py-2.5 font-medium sm:px-4">From</th>
                      <th className="px-3 py-2.5 font-medium sm:px-4">To</th>
                      <th className="px-3 py-2.5 font-medium sm:px-4">Ghun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.note_id} className="border-b border-border/40 align-top last:border-0">
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs sm:px-4">{r.campaign_date}</td>
                        <td className="px-3 py-2.5 sm:px-4">
                          <div className="font-medium">{r.author_display_name}</div>
                          <div className="text-xs text-muted-foreground">{r.author_email}</div>
                        </td>
                        <td className="px-3 py-2.5 sm:px-4">
                          <div className="font-medium">{r.recipient_display_name}</div>
                          <div className="text-xs text-muted-foreground">{r.recipient_email}</div>
                        </td>
                        <td className="max-w-xl px-3 py-2.5 text-muted-foreground sm:px-4">{r.body}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
