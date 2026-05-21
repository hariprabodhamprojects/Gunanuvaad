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

export async function deleteAllowlistUserAction(formData: FormData): Promise<void> {
  await requireOrganizer();
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  if (!email) {
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_allowlist_user", {
    p_email: email,
  });

  if (error) {
    console.error("[admin] admin_delete_allowlist_user", error.message);
    return;
  }

  const row = data as { ok?: boolean; code?: string } | null;
  if (!row?.ok) {
    console.error("[admin] admin_delete_allowlist_user failed", row?.code ?? "failed");
    return;
  }

  revalidatePath("/admin/invites");
  revalidatePath("/admin");
}

export async function addAllowlistUserAction(input: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<{ ok: boolean; code: string }> {
  await requireOrganizer();
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!email) return { ok: false, code: "invalid_email" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_add_allowlist_user", {
    p_email: email,
    p_first_name: firstName,
    p_last_name: lastName,
  });

  if (error) {
    console.error("[admin] admin_add_allowlist_user", error.message);
    return { ok: false, code: "rpc_error" };
  }

  const row = data as { ok?: boolean; code?: string } | null;
  if (!row?.ok) {
    return { ok: false, code: row?.code ?? "failed" };
  }

  revalidatePath("/admin/invites");
  revalidatePath("/admin");
  return { ok: true, code: row.code ?? "created" };
}

export async function deleteAllowlistUserByEmailAction(
  emailInput: string,
): Promise<{ ok: boolean; code: string }> {
  await requireOrganizer();
  const email = emailInput.trim().toLowerCase();
  if (!email) return { ok: false, code: "invalid_email" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_allowlist_user", {
    p_email: email,
  });

  if (error) {
    console.error("[admin] admin_delete_allowlist_user", error.message);
    return { ok: false, code: "rpc_error" };
  }

  const row = data as { ok?: boolean; code?: string } | null;
  if (!row?.ok) {
    return { ok: false, code: row?.code ?? "failed" };
  }

  revalidatePath("/admin/invites");
  revalidatePath("/admin");
  return { ok: true, code: "deleted" };
}
