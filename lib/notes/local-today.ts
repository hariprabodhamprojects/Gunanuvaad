/**
 * The user's calendar date in their local timezone (`YYYY-MM-DD`).
 * Use for calendar UI so “today” matches wall time (e.g. Canada) while note
 * rows still use `campaign_date` from the server.
 */
export function getLocalDateTodayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
