import { createClient } from "@/lib/supabase/server";
import { displayAvatarUrl } from "@/lib/profile/avatar-display";

export type CommunitySpotlightNote = {
  kind: "note";
  id: string;
  body: string;
  recipient_display_name: string;
  recipient_avatar_url: string;
};

export type CommunitySpotlightSmruti = {
  kind: "smruti";
  id: string;
  caption: string;
  author_display_name: string;
  author_avatar_url: string;
  storage_path: string;
};

export type CommunitySpotlightSwadhyay = {
  kind: "swadhyay";
  id: string;
  body: string;
  topic_title: string;
  author_display_name: string;
  author_avatar_url: string;
};

export type CommunitySpotlightSlide =
  | CommunitySpotlightNote
  | CommunitySpotlightSmruti
  | CommunitySpotlightSwadhyay;

function parseSlide(raw: unknown): CommunitySpotlightSlide | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const kind = o.kind;
  const id = typeof o.id === "string" ? o.id : null;
  if (!id) return null;
  if (kind === "note") {
    const body = typeof o.body === "string" ? o.body : "";
    const recipient_display_name =
      typeof o.recipient_display_name === "string" ? o.recipient_display_name : "";
    const rawAvatar =
      typeof o.recipient_avatar_url === "string" ? o.recipient_avatar_url.trim() : "";
    const recipient_avatar_url =
      rawAvatar.startsWith("http") ? (displayAvatarUrl(rawAvatar) ?? rawAvatar) : rawAvatar || "/logo.png";
    return { kind: "note", id, body, recipient_display_name, recipient_avatar_url };
  }
  if (kind === "smruti") {
    const caption = typeof o.caption === "string" ? o.caption : "";
    const author_display_name =
      typeof o.author_display_name === "string" ? o.author_display_name : "";
    const author_avatar_url =
      typeof o.author_avatar_url === "string" ? o.author_avatar_url : "";
    const storage_path = typeof o.storage_path === "string" ? o.storage_path : "";
    if (!storage_path.trim()) return null;
    return { kind: "smruti", id, caption, author_display_name, author_avatar_url, storage_path };
  }
  if (kind === "swadhyay") {
    const body = typeof o.body === "string" ? o.body : "";
    const topic_title = typeof o.topic_title === "string" ? o.topic_title : "";
    const author_display_name =
      typeof o.author_display_name === "string" ? o.author_display_name : "";
    const author_avatar_url =
      typeof o.author_avatar_url === "string" ? o.author_avatar_url : "";
    return { kind: "swadhyay", id, body, topic_title, author_display_name, author_avatar_url };
  }
  return null;
}

/**
 * Mixed spotlight: up to 2 ghun + 2 Smruti + 2 Swadhyay (7-day), interleaved.
 * Deck rotates per user via `profiles.community_spotlight_deck_index`. The next deck
 * loads after one full carousel loop (`community_spotlight_advance_deck`), not on
 * every page refresh.
 */
export async function getCommunitySpotlightSlides(): Promise<CommunitySpotlightSlide[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("community_spotlight_random");

  if (error) {
    console.error("[home] community_spotlight_random", error.message);
    return [];
  }

  let raw: unknown = data;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const out: CommunitySpotlightSlide[] = [];
  for (const row of raw) {
    const s = parseSlide(row);
    if (s) out.push(s);
  }
  return out;
}
