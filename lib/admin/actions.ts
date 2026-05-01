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

export async function deleteAllowlistUserAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { email: actorEmail } = await requireOrganizer();
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  if (!email) {
    return { ok: false, error: "missing_email" };
  }
  if (email === actorEmail) {
    return { ok: false, error: "cannot_delete_self" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("allowed_emails")
    .delete()
    .eq("email", email);

  if (error) {
    console.error("[admin] delete allowed_email", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/invites");
  revalidatePath("/admin");
  return { ok: true };
}
