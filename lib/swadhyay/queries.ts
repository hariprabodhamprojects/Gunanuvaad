import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { createClient } from "@/lib/supabase/server";
import type { SwadhyayComment, SwadhyayTopic } from "@/lib/swadhyay/types";

export async function getTodaySwadhyayTopic(): Promise<SwadhyayTopic | null> {
  const supabase = await createClient();
  const today = getCampaignDateTodayISO();
  const { data, error } = await supabase
    .from("swadhyay_topics")
    .select("*")
    .eq("campaign_date", today)
    .maybeSingle();

  if (error) {
    console.error("[swadhyay] getTodaySwadhyayTopic", error.message);
    return null;
  }

  return (data as SwadhyayTopic | null) ?? null;
}

export async function getRecentSwadhyayTopics(limit = 14): Promise<SwadhyayTopic[]> {
  const supabase = await createClient();
  const lim = Math.max(1, Math.min(limit, 60));
  const { data, error } = await supabase
    .from("swadhyay_topics")
    .select("*")
    .order("campaign_date", { ascending: false })
    .limit(lim);

  if (error) {
    console.error("[swadhyay] getRecentSwadhyayTopics", error.message);
    return [];
  }

  return ((data ?? []) as SwadhyayTopic[]).filter((t) => Boolean(t.id));
}

export async function getTopicComments(topicId: string): Promise<SwadhyayComment[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("swadhyay_comments")
    .select("id, topic_id, author_id, parent_comment_id, body, is_deleted, created_at, updated_at")
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[swadhyay] getTopicComments", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<{
    id: string;
    topic_id: string;
    author_id: string;
    parent_comment_id: string | null;
    body: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
  }>;
  const ids = Array.from(new Set(rows.map((r) => r.author_id))).filter(Boolean);

  let profileMap = new Map<string, { display_name: string; avatar_url: string }>();
  if (ids.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    if (pErr) {
      console.error("[swadhyay] getTopicComments profiles", pErr.message);
    } else {
      profileMap = new Map(
        ((profiles ?? []) as Array<{ id: string; display_name: string | null; avatar_url: string | null }>).map(
          (p) => [
            p.id,
            {
              display_name: p.display_name?.trim() || "Member",
              avatar_url: p.avatar_url?.trim() || "/logo.png",
            },
          ],
        ),
      );
    }
  }

  let reactionCountMap = new Map<string, number>();
  if (rows.length > 0) {
    const commentIds = rows.map((r) => r.id);
    const { data: reactions, error: rErr } = await supabase
      .from("swadhyay_comment_reactions")
      .select("comment_id")
      .in("comment_id", commentIds);
    if (rErr) {
      console.error("[swadhyay] getTopicComments reactions", rErr.message);
    } else {
      for (const entry of (reactions ?? []) as Array<{ comment_id: string }>) {
        reactionCountMap.set(entry.comment_id, (reactionCountMap.get(entry.comment_id) ?? 0) + 1);
      }
    }
  }

  let viewerReactedSet = new Set<string>();
  if (rows.length > 0 && user?.id) {
    const commentIds = rows.map((r) => r.id);
    const { data: mine, error: mineErr } = await supabase
      .from("swadhyay_comment_reactions")
      .select("comment_id")
      .eq("user_id", user.id)
      .in("comment_id", commentIds);
    if (mineErr) {
      console.error("[swadhyay] getTopicComments my reactions", mineErr.message);
    } else {
      viewerReactedSet = new Set(((mine ?? []) as Array<{ comment_id: string }>).map((m) => m.comment_id));
    }
  }

  return rows.map((r) => {
    const profile = profileMap.get(r.author_id);
    return {
      ...r,
      author_display_name: profile?.display_name || "Member",
      author_avatar_url: profile?.avatar_url || "/logo.png",
      reaction_count: reactionCountMap.get(r.id) ?? 0,
      viewer_reacted: viewerReactedSet.has(r.id),
    };
  });
}
