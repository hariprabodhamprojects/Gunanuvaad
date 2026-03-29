/**
 * Supabase/Postgres `date` may arrive as `YYYY-MM-DD` or a full ISO timestamp.
 * Using the first 10 chars keeps calendar keys stable (no UTC/local drift).
 */
export function normalizeCampaignDate(raw: string): string {
  const s = raw?.trim() ?? "";
  if (s.length >= 10) return s.slice(0, 10);
  return s;
}
