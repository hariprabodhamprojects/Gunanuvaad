"use server";

import { revalidatePath } from "next/cache";
import { NOTE_BODY_MAX_LEN, NOTE_BODY_MIN_LEN } from "@/lib/campaign-spec";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WriteEligibility =
  | { ok: true; code: string }
  | { ok: false; code: string; need_more?: number };

function parseEligibility(raw: unknown): WriteEligibility | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const ok = o.ok === true;
  const code = typeof o.code === "string" ? o.code : "unknown";
  if (ok) return { ok: true, code };
  const needMore = typeof o.need_more === "number" ? o.need_more : undefined;
  return { ok: false, code, need_more: needMore };
}

export async function getRecipientWriteEligibility(recipientId: string): Promise<WriteEligibility | null> {
  if (!UUID_RE.test(recipientId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("recipient_write_eligibility", {
    p_recipient_id: recipientId,
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

export async function submitDailyNote(recipientId: string, body: string): Promise<SubmitDailyNoteResult> {
  if (!UUID_RE.test(recipientId)) {
    return { ok: false, code: "invalid_recipient" };
  }
  const trimmed = body.trim();
  if (trimmed.length < NOTE_BODY_MIN_LEN || trimmed.length > NOTE_BODY_MAX_LEN) {
    return { ok: false, code: "invalid_body" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_daily_note", {
    p_recipient_id: recipientId,
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
  }

  return parsed;
}
