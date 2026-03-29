import { createClient } from "@/lib/supabase/server";
import type { AdminAllowlistRow, AdminNoteForFeatureRow } from "@/lib/admin/types";

export async function fetchAllowlistOverview(): Promise<AdminAllowlistRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_allowlist_overview");

  if (error) {
    console.error("[admin] admin_allowlist_overview", error.message);
    return [];
  }

  return (data ?? []) as AdminAllowlistRow[];
}

export async function fetchNotesForFeature(limit = 100): Promise<AdminNoteForFeatureRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_notes_for_feature", { p_limit: limit });

  if (error) {
    console.error("[admin] admin_notes_for_feature", error.message);
    return [];
  }

  return (data ?? []) as AdminNoteForFeatureRow[];
}
