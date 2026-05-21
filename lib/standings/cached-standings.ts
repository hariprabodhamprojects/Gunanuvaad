import { unstable_cache } from "next/cache";
import { getStandings } from "@/lib/standings/get-standings";
import type { StandingsPayload } from "@/lib/standings/types";

/** Header scores do not need a fresh RPC on every tab tap. */
export function getCachedStandings(): Promise<StandingsPayload | null> {
  return unstable_cache(
    async () => getStandings(),
    ["standings-payload"],
    { revalidate: 45 },
  )();
}
