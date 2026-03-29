import { StandingsView } from "@/components/standings-view";
import { getStandings } from "@/lib/standings/get-standings";

export const metadata = {
  title: "Standings — Gunanuvad",
};

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const data = await getStandings();

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        Couldn&apos;t load standings. If this persists, confirm the Phase 5 migration is applied in Supabase.
      </div>
    );
  }

  return <StandingsView data={data} />;
}
