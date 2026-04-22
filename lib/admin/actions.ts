"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/auth/require-organizer";
import { createClient } from "@/lib/supabase/server";

export async function approveDailyNoteAction(noteId: string): Promise<{ ok: boolean; error?: string }> {
  await requireOrganizer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_approve_daily_note", { p_note_id: noteId });

  if (error) {
    console.error("[admin] admin_approve_daily_note", error.message);
    return { ok: false, error: error.message };
  }

  const row = data as { ok?: boolean; code?: string } | null;
  if (!row?.ok) {
    return { ok: false, error: row?.code ?? "failed" };
  }

  revalidatePath("/admin/approved");
  revalidatePath("/home");
  return { ok: true };
}

export async function disapproveDailyNoteAction(noteId: string): Promise<{ ok: boolean; error?: string }> {
  await requireOrganizer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_disapprove_daily_note", { p_note_id: noteId });

  if (error) {
    console.error("[admin] admin_disapprove_daily_note", error.message);
    return { ok: false, error: error.message };
  }

  const row = data as { ok?: boolean; code?: string } | null;
  if (!row?.ok) {
    return { ok: false, error: row?.code ?? "failed" };
  }

  revalidatePath("/admin/approved");
  revalidatePath("/home");
  return { ok: true };
}
