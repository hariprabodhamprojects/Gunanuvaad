import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { createClient } from "@/lib/supabase/server";
import type { SwadhyayPost, SwadhyayReply, SwadhyayTopic } from "@/lib/swadhyay/types";

/**
 * Return the currently active topic (published, covers today's Toronto
 * campaign date) or null. Uses the SECURITY DEFINER RPC so the author can be
 * identified without profile RLS leakage.
 */
export async function getActiveSwadhyayTopic(): Promise<SwadhyayTopic | null> {
  const supabase = await createClient();
  const today = getCampaignDateTodayISO();
  const { data, error } = await supabase
    .rpc("active_swadhyay_topic_for", { p_day: today })
    .maybeSingle();

  if (error) {
    console.error("[swadhyay] getActiveSwadhyayTopic", error.message);
    return null;
  }

  return (data as SwadhyayTopic | null) ?? null;
}

/**
 * Full topic list for the admin dashboard — past, active, upcoming.
 * Organizers can see unpublished drafts thanks to the RLS policy.
 */
export async function getAllSwadhyayTopics(limit = 60): Promise<SwadhyayTopic[]> {
  const supabase = await createClient();
  const lim = Math.max(1, Math.min(limit, 200));
  const { data, error } = await supabase
    .from("swadhyay_topics")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(lim);

  if (error) {
    console.error("[swadhyay] getAllSwadhyayTopics", error.message);
    return [];
  }
  return ((data ?? []) as SwadhyayTopic[]).filter((t) => Boolean(t.id));
}

export async function getTopicPosts(topicId: string): Promise<SwadhyayPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("swadhyay_posts_for_topic", {
    p_topic_id: topicId,
  });

  if (error) {
    console.error("[swadhyay] getTopicPosts", error.message);
    return [];
  }
  return (data ?? []) as SwadhyayPost[];
}

export async function getPostReplies(postId: string): Promise<SwadhyayReply[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("swadhyay_replies_for_post", {
    p_post_id: postId,
  });

  if (error) {
    console.error("[swadhyay] getPostReplies", error.message);
    return [];
  }
  return (data ?? []) as SwadhyayReply[];
}
