import { createClient } from "@/lib/supabase/server";
import type { StandingsEntry, StandingsPayload } from "@/lib/standings/types";

function parseEntry(raw: unknown, key: "score" | "streak"): StandingsEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const rank = typeof o.rank === "number" ? o.rank : Number(o.rank);
  const id = typeof o.id === "string" ? o.id : null;
  const display_name = typeof o.display_name === "string" ? o.display_name : null;
  const avatar_url = typeof o.avatar_url === "string" ? o.avatar_url : null;
  if (!id || !display_name || !avatar_url || !Number.isFinite(rank)) return null;
  const base: StandingsEntry = { rank, id, display_name, avatar_url };
  if (key === "score") {
    const score = typeof o.score === "number" ? o.score : Number(o.score);
    if (!Number.isFinite(score)) return null;
    return { ...base, score };
  }
  const streak = typeof o.streak === "number" ? o.streak : Number(o.streak);
  if (!Number.isFinite(streak)) return null;
  return { ...base, streak };
}

function parsePayload(raw: unknown): StandingsPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const viewer_id = typeof o.viewer_id === "string" ? o.viewer_id : null;
  if (!viewer_id) return null;
  const pointsIn = Array.isArray(o.points) ? o.points : [];
  const streaksIn = Array.isArray(o.streaks) ? o.streaks : [];
  const points = pointsIn.map((p) => parseEntry(p, "score")).filter(Boolean) as StandingsEntry[];
  const streaks = streaksIn.map((p) => parseEntry(p, "streak")).filter(Boolean) as StandingsEntry[];
  return { points, streaks, viewer_id };
}

export async function getStandings(): Promise<StandingsPayload | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("standings_leaderboards");

  if (error) {
    console.error("[standings] standings_leaderboards", error.message);
    return null;
  }
  if (data == null) return null;
  return parsePayload(data);
}
