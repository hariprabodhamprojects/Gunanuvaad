import { createClient } from "@/lib/supabase/server";

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

  const recipientIds = [...new Set(notes.map((n) => n.recipient_id))];
  if (recipientIds.length === 0) return [];

  const { data: recipients, error: recipientsError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", recipientIds);

  if (recipientsError) {
    console.error("[daily-note] load recipient profiles", recipientsError.message);
  }

  const recipientMap = new Map(
    ((recipients ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[]).map((r) => [
      r.id,
      {
        name: r.display_name?.trim() || "User",
        avatarUrl: r.avatar_url?.trim() || "",
      },
    ]),
  );

  return notes.map((note) => {
    const recipient = recipientMap.get(note.recipient_id);
    return {
      ...note,
      recipient_name: recipient?.name || "User",
      recipient_avatar_url: recipient?.avatarUrl || "",
    };
  });
}
