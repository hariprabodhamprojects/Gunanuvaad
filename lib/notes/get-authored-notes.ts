import { createClient } from "@/lib/supabase/server";
import { normalizeCampaignDate } from "@/lib/notes/normalize-campaign-date";

export type AuthoredDailyNote = {
  id: string;
  body: string;
  campaign_date: string;
  created_at: string;
  recipient_id: string;
  recipient_name: string;
  recipient_avatar_url: string;
};

export async function getAuthoredDailyNotes(): Promise<AuthoredDailyNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_notes")
    .select("id, recipient_id, body, campaign_date, created_at")
    .order("campaign_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[daily-note] load authored notes", error.message);
    return [];
  }

  const notes = (data ?? []) as {
    id: string;
    recipient_id: string;
    body: string;
    campaign_date: string;
    created_at: string;
  }[];

  if (notes.length === 0) return [];

  const { data: roster, error: rosterError } = await supabase.rpc("roster_for_mosaic");
  if (rosterError) {
    console.error("[daily-note] roster_for_mosaic", rosterError.message);
  }

  const rosterMap = new Map(
    ((roster ?? []) as { id: string; display_name: string; avatar_url: string }[]).map((r) => [
      r.id,
      { name: r.display_name?.trim() || "", avatarUrl: r.avatar_url?.trim() || "" },
    ]),
  );

  return notes.map((note) => {
    const recipient = rosterMap.get(note.recipient_id);
    return {
      ...note,
      campaign_date: normalizeCampaignDate(note.campaign_date),
      recipient_name: recipient?.name || "User",
      recipient_avatar_url: recipient?.avatarUrl || "",
    };
  });
}
