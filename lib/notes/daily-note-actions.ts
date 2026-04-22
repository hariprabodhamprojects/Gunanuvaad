"use server";

import { revalidatePath } from "next/cache";
import { NOTE_BODY_MAX_LEN, NOTE_BODY_MIN_LEN } from "@/lib/campaign-spec";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WriteEligibility =
  | { ok: true; code: string }
  | { ok: false; code: string; need_more?: number };

export type RecipientTarget = {
  rosterRowId?: string | null;
  recipientId?: string | null;
  recipientEmail?: string | null;
};

async function resolveTargetFromRosterRow(
  rowId: string | null,
): Promise<{ recipientId: string | null; recipientEmail: string | null } | null> {
  const normalized = rowId?.trim() || null;
  if (!normalized) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("roster_for_picker");
  if (error) {
    console.error("[daily-note] roster_for_picker", error.message);
    return null;
  }

  const rows = (data ?? []) as {
    row_id: string;
    recipient_id: string | null;
    recipient_email: string | null;
  }[];
  const match = rows.find((r) => r.row_id === normalized);
  if (!match) return null;

  return {
    recipientId: match.recipient_id ?? null,
    recipientEmail: match.recipient_email?.trim().toLowerCase() || null,
  };
}

function parseEligibility(raw: unknown): WriteEligibility | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const ok = o.ok === true;
  const code = typeof o.code === "string" ? o.code : "unknown";
  if (ok) return { ok: true, code };
  const needMore = typeof o.need_more === "number" ? o.need_more : undefined;
  return { ok: false, code, need_more: needMore };
}

export async function getRecipientWriteEligibility(target: RecipientTarget): Promise<WriteEligibility | null> {
  let recipientId = target.recipientId?.trim() || null;
  let recipientEmail = target.recipientEmail?.trim().toLowerCase() || null;
  if (!recipientId && !recipientEmail) {
    const resolved = await resolveTargetFromRosterRow(target.rosterRowId?.trim() || null);
    if (resolved) {
      recipientId = resolved.recipientId;
      recipientEmail = resolved.recipientEmail;
    }
  }
  if (!recipientId && !recipientEmail) return null;
  if (recipientId && !UUID_RE.test(recipientId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("recipient_write_eligibility", {
    p_recipient_id: recipientId,
    p_recipient_email: recipientEmail,
  });
  if (error) {
    console.error("[daily-note] recipient_write_eligibility", error.message);
    return { ok: false, code: "rpc_error" };
  }
  return parseEligibility(data);
}

export type SubmitDailyNoteResult =
  | { ok: true; id: string }
  | { ok: false; code: string; need_more?: number };

function parseSubmitResult(raw: unknown): SubmitDailyNoteResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.ok === true && typeof o.id === "string") return { ok: true, id: o.id };
  if (o.ok === false && typeof o.code === "string") {
    return {
      ok: false,
      code: o.code,
      need_more: typeof o.need_more === "number" ? o.need_more : undefined,
    };
  }
  return null;
}

export async function submitDailyNote(target: RecipientTarget, body: string): Promise<SubmitDailyNoteResult> {
  let recipientId = target.recipientId?.trim() || null;
  let recipientEmail = target.recipientEmail?.trim().toLowerCase() || null;
  if (!recipientId && !recipientEmail) {
    const resolved = await resolveTargetFromRosterRow(target.rosterRowId?.trim() || null);
    if (resolved) {
      recipientId = resolved.recipientId;
      recipientEmail = resolved.recipientEmail;
    }
  }
  if (!recipientId && !recipientEmail) {
    return { ok: false, code: "invalid_recipient" };
  }
  if (recipientId && !UUID_RE.test(recipientId)) return { ok: false, code: "invalid_recipient" };
  const trimmed = body.trim();
  if (trimmed.length < NOTE_BODY_MIN_LEN || trimmed.length > NOTE_BODY_MAX_LEN) {
    return { ok: false, code: "invalid_body" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_daily_note", {
    p_recipient_id: recipientId,
    p_recipient_email: recipientEmail,
    p_body: trimmed,
  });

  if (error) {
    console.error("[daily-note] submit_daily_note", error.message);
    return { ok: false, code: "rpc_error" };
  }

  const parsed = parseSubmitResult(data);
  if (!parsed) return { ok: false, code: "rpc_error" };

  if (parsed.ok) {
    revalidatePath("/home");
    // The calendar reads from the same `daily_notes` rows this RPC inserts;
    // without this the author's own new note would only show up after a
    // manual reload of /calendar.
    revalidatePath("/calendar");
  }

  return parsed;
}
