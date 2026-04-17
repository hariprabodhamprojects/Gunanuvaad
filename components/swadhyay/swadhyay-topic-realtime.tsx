"use client";

import { useRealtimeRefresh } from "@/lib/supabase/use-realtime-refresh";

type Props = {
  /** Campaign-day ISO date the page is looking for, e.g. "2026-04-16". */
  campaignDate: string;
};

/**
 * Invisible client helper mounted on `/swadhyay` while the organizer has not
 * yet published today's topic. When a new row for today is inserted (or its
 * `is_published` flips), the server tree is re-fetched so the page replaces
 * the empty state with the real topic and comments UI — no manual refresh
 * required.
 *
 * Once the topic is on the page, `SwadhyayComments` owns the subscription
 * lifecycle and this component is unmounted.
 */
export function SwadhyayTopicRealtime({ campaignDate }: Props) {
  useRealtimeRefresh({
    channel: `swadhyay-topic-wait-${campaignDate}`,
    subscriptions: [
      {
        table: "swadhyay_topics",
        filter: `campaign_date=eq.${campaignDate}`,
      },
    ],
  });
  return null;
}
