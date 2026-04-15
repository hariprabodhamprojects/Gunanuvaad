import { StandingsView } from "@/components/standings-view";
import { getStandings } from "@/lib/standings/get-standings";

export const metadata = {
  title: "Standings — MananChintan",
};

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const data = await getStandings();

  if (!data) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Unavailable.</div>;
  }

  return (
    <div className="layout-reading">
      <StandingsView data={data} />
    </div>
  );
}
