import { createClient } from "@/lib/supabase/server";

export type ApprovedSlide = {
  note_id: string;
  body: string;
  recipient_display_name: string;
  recipient_avatar_url: string;
};

function isSlide(x: unknown): x is ApprovedSlide {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.note_id === "string" &&
    typeof o.body === "string" &&
    typeof o.recipient_display_name === "string" &&
    typeof o.recipient_avatar_url === "string"
  );
}

/** Up to `limit` random approved notes for the home carousel (allowlisted users only; RPC enforces). */
export async function getApprovedNotesSlideshowSlides(limit = 5): Promise<ApprovedSlide[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approved_notes_slideshow_random", { p_limit: limit });

  if (error) {
    console.error("[home] approved_notes_slideshow_random", error.message);
    return [];
  }

  if (!Array.isArray(data)) return [];
  return data.filter(isSlide);
}
