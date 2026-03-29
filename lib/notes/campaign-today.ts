/**
 * Calendar “today” for campaign dates — matches `submit_daily_note` in the DB
 * (`timezone('Asia/Kolkata', now())::date`).
 */
export function getCampaignDateTodayISO(reference: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(reference);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (y && m && d) return `${y}-${m}-${d}`;
  return formatter.format(reference).replace(/\//g, "-").slice(0, 10);
}
