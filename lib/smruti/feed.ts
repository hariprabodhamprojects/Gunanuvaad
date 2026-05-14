import { createClient } from "@/lib/supabase/server";
import type { SmrutiFeedPost } from "@/lib/smruti/types";

function parseFeedPayload(raw: unknown): SmrutiFeedPost[] {
  if (!Array.isArray(raw)) return [];
  const out: SmrutiFeedPost[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : null;
    const author_id = typeof o.author_id === "string" ? o.author_id : null;
    const caption = typeof o.caption === "string" ? o.caption : null;
    const created_at = typeof o.created_at === "string" ? o.created_at : null;
    if (!id || !author_id || !caption || !created_at) continue;
    const mediaRaw = o.media;
    const media: SmrutiFeedPost["media"] = [];
    if (Array.isArray(mediaRaw)) {
      for (const m of mediaRaw) {
        if (!m || typeof m !== "object") continue;
        const mr = m as Record<string, unknown>;
        const sortRaw = mr.sort_order;
        const sort_order =
          typeof sortRaw === "number" && Number.isFinite(sortRaw)
            ? sortRaw
            : typeof sortRaw === "string" && /^\d+$/.test(sortRaw)
              ? Number.parseInt(sortRaw, 10)
              : null;
        const storage_path = typeof mr.storage_path === "string" ? mr.storage_path : null;
        if (sort_order === null || !storage_path) continue;
        media.push({ sort_order, storage_path });
      }
    }
    const likeRaw = o.like_count;
    const like_count =
      typeof likeRaw === "number" && Number.isFinite(likeRaw)
        ? likeRaw
        : typeof likeRaw === "string" && /^\d+$/.test(likeRaw)
          ? Number.parseInt(likeRaw, 10)
          : 0;
    out.push({
      id,
      author_id,
      caption,
      created_at,
      author_display_name: typeof o.author_display_name === "string" ? o.author_display_name : null,
      author_avatar_url: typeof o.author_avatar_url === "string" ? o.author_avatar_url : null,
      media,
      like_count,
      liked_by_me: o.liked_by_me === true,
    });
  }
  return out;
}

export async function getSmrutiFeed(options?: {
  limit?: number;
  before?: string | null;
}): Promise<SmrutiFeedPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("smruti_feed_page", {
    p_limit: options?.limit ?? 30,
    p_before: options?.before ?? null,
  });
  if (error) {
    console.error("[smruti] smruti_feed_page", error.message);
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
  return parseFeedPayload(raw);
}
