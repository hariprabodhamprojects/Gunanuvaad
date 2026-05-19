import type { SwadhyayTopic } from "@/lib/swadhyay/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse YYYY-MM-DD as local midnight; returns null if invalid. */
export function parseCampaignDate(iso: string | null | undefined): Date | null {
  const trimmed = iso?.trim() ?? "";
  if (!ISO_DATE.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Topic row is safe to show in the UI (avoids "Invalid Date" headers). */
export function isUsableSwadhyayTopic(topic: SwadhyayTopic | null | undefined): boolean {
  if (!topic?.id?.trim() || !topic.title?.trim()) return false;
  const start = parseCampaignDate(topic.start_date);
  const end = parseCampaignDate(topic.end_date);
  if (!start || !end) return false;
  return end.getTime() >= start.getTime();
}

/** Short human week range, e.g. "Apr 17 – 24" or "Apr 30 – May 6". */
export function formatSwadhyayWeekRange(startISO: string, endISO: string): string | null {
  const start = parseCampaignDate(startISO);
  const end = parseCampaignDate(endISO);
  if (!start || !end) return null;

  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const monthFmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const endFmt: Intl.DateTimeFormatOptions = sameMonth
    ? { day: "numeric" }
    : { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, monthFmt)} – ${end.toLocaleDateString(undefined, endFmt)}`;
}

export function swadhyayWeekProgress(
  startISO: string,
  endISO: string,
  todayISO: string,
): { current: number; total: number; pct: number } | null {
  const start = parseCampaignDate(startISO);
  const end = parseCampaignDate(endISO);
  const today = parseCampaignDate(todayISO);
  if (!start || !end || !today) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
  const raw = Math.round((today.getTime() - start.getTime()) / dayMs) + 1;
  const current = Math.min(total, Math.max(1, raw));
  return { current, total, pct: Math.round((current / total) * 100) };
}
