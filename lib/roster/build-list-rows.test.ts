import { describe, expect, it } from "vitest";
import { buildRosterListRows } from "@/lib/roster/build-list-rows";
import type { RosterMember } from "@/lib/roster/types";

function member(id: string, display_name: string): RosterMember {
  return {
    id,
    display_name,
    recipient_id: null,
    can_write: true,
    avatar_url: "/logo.png",
    has_signed_up: true,
  };
}

describe("buildRosterListRows", () => {
  it("marks headers when first letter changes", () => {
    const rows = buildRosterListRows([
      member("1", "Aarti"),
      member("2", "Aayush"),
      member("3", "Bhavya"),
      member("4", "Chirag"),
    ]);

    expect(rows.map((r) => [r.member.display_name, r.firstLetter, r.showHeader])).toEqual([
      ["Aarti", "A", true],
      ["Aayush", "A", false],
      ["Bhavya", "B", true],
      ["Chirag", "C", true],
    ]);
  });
});
