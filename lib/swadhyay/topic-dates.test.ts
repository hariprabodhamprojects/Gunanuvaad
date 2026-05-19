import { describe, expect, it } from "vitest";
import {
  formatSwadhyayWeekRange,
  isUsableSwadhyayTopic,
  parseCampaignDate,
} from "@/lib/swadhyay/topic-dates";
import type { SwadhyayTopic } from "@/lib/swadhyay/types";

const baseTopic: SwadhyayTopic = {
  id: "t1",
  title: "Theme",
  description: "",
  start_date: "2026-05-12",
  end_date: "2026-05-18",
  is_published: true,
  posted_by: "u1",
  created_at: "",
  updated_at: "",
};

describe("topic-dates", () => {
  it("rejects invalid ISO dates", () => {
    expect(parseCampaignDate("")).toBeNull();
    expect(parseCampaignDate("not-a-date")).toBeNull();
    expect(isUsableSwadhyayTopic({ ...baseTopic, start_date: "" })).toBe(false);
  });

  it("formats a valid week range", () => {
    expect(formatSwadhyayWeekRange("2026-05-12", "2026-05-18")).toMatch(/May/);
  });
});
