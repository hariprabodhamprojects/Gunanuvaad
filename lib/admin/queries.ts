import { createClient } from "@/lib/supabase/server";
import type { AdminAllowlistRow, AdminGhunExportRow, AdminNoteForApprovalRow } from "@/lib/admin/types";

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

export async function fetchGhunosForRecipientExport(params: {
  recipientQuery: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<AdminGhunExportRow[]> {
  const q = params.recipientQuery.trim();
  if (!q) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ghunos_for_recipient", {
    p_recipient_query: q,
    p_from: params.from || null,
    p_to: params.to || null,
    p_limit: params.limit ?? 1000,
  });

  if (error) {
    console.error("[admin] admin_ghunos_for_recipient", error.message);
    return [];
  }

  return (data ?? []) as AdminGhunExportRow[];
}
