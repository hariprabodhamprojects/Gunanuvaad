import { createClient } from "@/lib/supabase/server";
import type { RosterMember } from "@/lib/roster/types";

export async function getRosterMembers(): Promise<RosterMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("roster_for_picker");

  if (error) {
    console.error("[roster] roster_for_picker", error.message);
    return [];
  }

  const rows = (data ?? []) as {
    row_id: string;
    recipient_id: string | null;
    recipient_email: string | null;
    display_name: string;
    avatar_url: string | null;
    has_signed_up: boolean;
  }[];
  return rows.map((r) => ({
    id: r.row_id,
    recipient_id: r.recipient_id,
    recipient_email: r.recipient_email,
    display_name: r.display_name,
    avatar_url: r.avatar_url?.trim() || "/logo.png",
    has_signed_up: r.has_signed_up === true,
  }));
}
