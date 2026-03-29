import { createClient } from "@/lib/supabase/server";
import type { AdminAllowlistRow, AdminNoteForApprovalRow } from "@/lib/admin/types";

export async function fetchAllowlistOverview(): Promise<AdminAllowlistRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_allowlist_overview");

  if (error) {
    console.error("[admin] admin_allowlist_overview", error.message);
    return [];
  }

  return (data ?? []) as AdminAllowlistRow[];
}

export async function fetchNotesForApproval(limit = 100): Promise<AdminNoteForApprovalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_notes_for_approval", { p_limit: limit });

  if (error) {
    console.error("[admin] admin_notes_for_approval", error.message);
    return [];
  }

  return (data ?? []) as AdminNoteForApprovalRow[];
}
