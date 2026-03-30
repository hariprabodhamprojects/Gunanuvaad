import { createClient } from "@/lib/supabase/server";
import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";
import { getNextCampaignDayStartDate } from "@/lib/notes/campaign-next-reset";

export type DailyCampaignStatus = {
  sentToday: boolean;
  campaignTodayISO: string;
  nextResetAt: string;
};

export async function getDailyCampaignStatus(userId: string): Promise<DailyCampaignStatus> {
  const supabase = await createClient();
  const campaignTodayISO = getCampaignDateTodayISO();

  const { data: row } = await supabase
    .from("daily_notes")
    .select("id")
    .eq("author_id", userId)
    .eq("campaign_date", campaignTodayISO)
    .limit(1)
    .maybeSingle();

  const sentToday = row != null;
  const next = getNextCampaignDayStartDate();

  return {
    sentToday,
    campaignTodayISO,
    nextResetAt: next.toISOString(),
  };
}
