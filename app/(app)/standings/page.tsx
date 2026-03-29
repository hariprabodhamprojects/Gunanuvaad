import { StandingsView } from "@/components/standings-view";
import { getStandings } from "@/lib/standings/get-standings";

export const metadata = {
  title: "Standings — Gunanuvad",
};

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const data = await getStandings();

  if (!data) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Unavailable.</div>;
  }

  return <StandingsView data={data} />;
}
