import { CAMPAIGN_TIMEZONE } from "@/lib/campaign-spec";

/**
 * Five push reminders per day in {@link CAMPAIGN_TIMEZONE} (America/Toronto).
 *
 * Distribution (note-first, per product call):
 *   3× nudge the daily note (morning, midday, last-call evening)
 *   1× nudge sharing on the Smruti feed
 *   1× nudge the weekly Swadhyay reflection
 *
 * Copy intentionally mirrors the landing splash: a quiet Gujarati title plus
 * a warm one-line English body. Edit strings here; the cron handler picks
 * whichever slot matches the current minute.
 */
export type ReminderSlot = {
  /** "HH:MM" 24-hour, in `America/Toronto`. */
  time: string;
  /** Stable identifier so we can `tag:` the OS notification and dedupe. */
  id: string;
  /** Surface the click sends the user to. */
  url: "/home" | "/feed" | "/swadhyay";
  title: string;
  body: string;
};

export const REMINDER_SLOTS: readonly ReminderSlot[] = [
  {
    id: "morning-note",
    time: "09:00",
    url: "/home",
    title: "જય સ્વામિનારાયણ ✨",
    body: "Start your day with ghun sharing of bhaktos. ગુણ ગાવાથી જીવ બ્રહ્મરૂપ થઈ જાય.",
  },
  {
    id: "midday-note",
    time: "12:30",
    url: "/home",
    title: "મનન ચિંતન",
    body: "Lunchtime pause — write today's ghun. ગુણ ગાવાથી જીવ બ્રહ્મરૂપ થઈ જાય.",
  },
  {
    id: "afternoon-feed",
    time: "17:00",
    url: "/feed",
    title: "Share a moment ✨",
    body: "Drop a smruti or a small thought on the feed.",
  },
  {
    id: "evening-note",
    time: "19:30",
    url: "/home",
    title: "Ghun gaan before Pet Puja!",
    body: "Please share some ghuns of bhaktos before Pet Puja.",
  },
  {
    id: "night-swadhyay",
    time: "21:30",
    url: "/swadhyay",
    title: "This week's Swadhyay",
    body: "Reflect on the swadhyay topic and share before you sleep — even one line counts.",
  },
] as const;

export type ReminderSlotId = (typeof REMINDER_SLOTS)[number]["id"];

/** Look up a slot by id (for manual / test sends). */
export function getReminderSlotById(id: string): ReminderSlot | undefined {
  return REMINDER_SLOTS.find((s) => s.id === id);
}

/** Window (in minutes) around a slot time during which the cron will fire it. */
export const REMINDER_SLOT_TOLERANCE_MIN = 7;

/**
 * Returns the slot whose scheduled time is closest to `reference` (in the
 * campaign timezone), but only if it falls within ±{@link REMINDER_SLOT_TOLERANCE_MIN}.
 * Returns `null` outside any window.
 *
 * This makes the cron resilient to small drift: scheduling Vercel cron at
 * `*​/15 * * * *` and using a 7-minute window guarantees exactly one match
 * per slot per day with no overlap.
 */
export function pickReminderSlot(reference: Date = new Date()): ReminderSlot | null {
  const nowMinutes = minutesOfDayInTZ(reference, CAMPAIGN_TIMEZONE);
  let best: { slot: ReminderSlot; delta: number } | null = null;

  for (const slot of REMINDER_SLOTS) {
    const slotMinutes = parseHHMM(slot.time);
    const delta = Math.abs(nowMinutes - slotMinutes);
    if (delta <= REMINDER_SLOT_TOLERANCE_MIN) {
      if (!best || delta < best.delta) {
        best = { slot, delta };
      }
    }
  }

  return best?.slot ?? null;
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map((n) => Number.parseInt(n, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesOfDayInTZ(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const h = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = Number.parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return h * 60 + m;
}
