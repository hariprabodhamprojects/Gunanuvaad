"use client";

import { useRealtimeRefresh } from "@/lib/supabase/use-realtime-refresh";

type Props = {
  /** Campaign-day ISO date the page is looking for, e.g. "2026-04-16". */
  campaignDate: string;
};

/**
 * Invisible helper mounted on `/swadhyay` while there is no active weekly
 * topic covering today. Weekly topics are now stored with start/end date
 * ranges (see 20260418120000_swadhyay_weekly_redesign.sql), so we listen for
 * any change on `swadhyay_topics` and let the server re-run
 * `active_swadhyay_topic_for(today)` on refresh. Once a topic is on the page,
 * `SwadhyayPostsFeed` owns the richer subscription set and this component
 * unmounts.
 */
export function SwadhyayTopicRealtime({ campaignDate }: Props) {
  useRealtimeRefresh({
    channel: `swadhyay-topic-wait-${campaignDate}`,
    subscriptions: [{ table: "swadhyay_topics" }],
  });
  return null;
}
