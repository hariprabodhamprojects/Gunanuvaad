/**
 * The permanent "General" Swadhyay topic. Lets members always share a
 * reflection even when no organizer-set weekly topic is active.
 *
 * Authoritative copy: `supabase/migrations/20260604130000_swadhyay_general_topic.sql`.
 * The UI hides week-range / progress chrome for this topic and uses generic copy.
 */
export const GENERAL_SWADHYAY_TOPIC_ID = "00000000-0000-0000-0000-000000000001";

export function isGeneralSwadhyayTopic(
  topic: { id: string } | null | undefined,
): boolean {
  return Boolean(topic && topic.id === GENERAL_SWADHYAY_TOPIC_ID);
}
