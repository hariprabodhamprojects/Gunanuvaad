import { createClient } from "@/lib/supabase/server";
import { normalizeCampaignDate } from "@/lib/notes/normalize-campaign-date";
import { resolveRecipientAvatarUrl, resolveRecipientName } from "@/lib/notes/recipient-display";

export type AuthoredDailyNote = {
  id: string;
  body: string;
  campaign_date: string;
  created_at: string;
  recipient_id: string | null;
  recipient_email: string | null;
  recipient_name: string;
  recipient_avatar_url: string;
};

export async function getAuthoredDailyNotes(): Promise<AuthoredDailyNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_notes")
    .select("id, recipient_id, recipient_email, body, campaign_date, created_at")
    .order("campaign_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[daily-note] load authored notes", error.message);
    return [];
  }

  const notes = (data ?? []) as {
    id: string;
    recipient_id: string | null;
    recipient_email: string | null;
    body: string;
    campaign_date: string;
    created_at: string;
  }[];

  if (notes.length === 0) return [];

  const { data: roster, error: rosterError } = await supabase.rpc("roster_for_picker");
  if (rosterError) {
    console.error("[daily-note] roster_for_picker", rosterError.message);
  }

  const byRecipientId = new Map<string, { name: string; avatarUrl: string }>();
  const byRecipientEmail = new Map<string, { name: string; avatarUrl: string }>();

  for (const r of (roster ?? []) as {
    recipient_id: string | null;
    recipient_email: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }[]) {
    const name = r.display_name?.trim() || "";
    const avatarUrl = r.avatar_url?.trim() || "";
    const entry = { name, avatarUrl };
    if (r.recipient_id) {
      byRecipientId.set(r.recipient_id, entry);
    }
    const email = r.recipient_email?.trim().toLowerCase();
    if (email) {
      byRecipientEmail.set(email, entry);
    }
  }

  return notes.map((note) => {
    const email = note.recipient_email?.trim().toLowerCase() || null;
    const byId = note.recipient_id ? byRecipientId.get(note.recipient_id) : undefined;
    const byEmail = email ? byRecipientEmail.get(email) : undefined;

    const recipient_name = resolveRecipientName(byId, byEmail, email);
    const recipient_avatar_url = resolveRecipientAvatarUrl(byId, byEmail);

    return {
      ...note,
      campaign_date: normalizeCampaignDate(note.campaign_date),
      recipient_name,
      recipient_avatar_url,
    };
  });
}
