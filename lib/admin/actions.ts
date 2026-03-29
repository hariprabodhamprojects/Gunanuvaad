"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function featureDailyNoteAction(noteId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_feature_daily_note", { p_note_id: noteId });

  if (error) {
    console.error("[admin] admin_feature_daily_note", error.message);
    return { ok: false, error: error.message };
  }

  const row = data as { ok?: boolean; code?: string } | null;
  if (!row?.ok) {
    return { ok: false, error: row?.code ?? "failed" };
  }

  revalidatePath("/admin/featured");
  return { ok: true };
}

export async function unfeatureDailyNoteAction(noteId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_unfeature_daily_note", { p_note_id: noteId });

  if (error) {
    console.error("[admin] admin_unfeature_daily_note", error.message);
    return { ok: false, error: error.message };
  }

  const row = data as { ok?: boolean; code?: string } | null;
  if (!row?.ok) {
    return { ok: false, error: row?.code ?? "failed" };
  }

  revalidatePath("/admin/featured");
  return { ok: true };
}
