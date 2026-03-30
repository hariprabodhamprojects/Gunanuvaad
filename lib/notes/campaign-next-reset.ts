import { getCampaignDateTodayISO } from "@/lib/notes/campaign-today";

/**
 * First instant (UTC `Date`) when the campaign calendar date advances in `CAMPAIGN_TIMEZONE`
 * relative to `reference` (start of the *next* campaign day).
 */
export function getNextCampaignDayStartDate(reference: Date = new Date()): Date {
  const today = getCampaignDateTodayISO(reference);
  let lo = reference.getTime();
  let hi = lo + 50 * 60 * 60 * 1000;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (getCampaignDateTodayISO(new Date(mid)) !== today) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return new Date(lo);
}
