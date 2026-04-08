import { createClient } from "@/lib/supabase/server";
import type { RosterMember } from "@/lib/roster/types";

export async function getRosterMembers(): Promise<RosterMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("roster_for_picker");

  if (error) {
    console.error("[roster] roster_for_picker", error.message);
    return [];
  }

  const rows = (data ?? []) as { id: string; display_name: string; avatar_url: string | null }[];
  return rows.map((r) => ({
    id: r.id,
    display_name: r.display_name,
    avatar_url: r.avatar_url?.trim() || "/logo.png",
  }));
}
