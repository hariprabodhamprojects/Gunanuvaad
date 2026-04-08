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
  const { data, error } = await supabase.rpc("swadhyay_comments_for_topic", {
    p_topic_id: topicId,
  });

  if (error) {
    console.error("[swadhyay] getTopicComments", error.message);
    return [];
  }
  return (data ?? []) as SwadhyayComment[];
}
