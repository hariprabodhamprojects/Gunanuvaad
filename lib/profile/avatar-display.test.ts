import { describe, expect, it } from "vitest";
import { avatarUrlBase, displayAvatarUrl } from "@/lib/profile/avatar-display";

describe("displayAvatarUrl", () => {
  it("re-applies v from updated_at", () => {
    const stored = "https://x.supabase.co/storage/v1/object/public/avatars/u/a.jpg?v=old";
    const out = displayAvatarUrl(stored, "2026-05-21T12:00:00.000Z");
    expect(out).toContain("a.jpg");
    expect(out).toContain(`v=${new Date("2026-05-21T12:00:00.000Z").getTime()}`);
    expect(out).not.toContain("v=old");
  });

  it("avatarUrlBase strips query", () => {
    expect(avatarUrlBase("https://x.co/a.jpg?a=1#hash")).toBe("https://x.co/a.jpg");
  });
});
