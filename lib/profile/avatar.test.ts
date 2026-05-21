import { describe, expect, it } from "vitest";
import { avatarProfileUrl } from "@/lib/profile/avatar";

describe("avatarProfileUrl", () => {
  it("appends a version query param", () => {
    const url = avatarProfileUrl("https://x.supabase.co/storage/v1/object/public/avatars/u/avatar.jpg", 123);
    expect(url).toContain("v=123");
  });

  it("replaces an existing version param", () => {
    const base = "https://x.supabase.co/storage/v1/object/public/avatars/u/avatar.jpg?v=1";
    const url = avatarProfileUrl(base, 999);
    expect(url).toBe(
      "https://x.supabase.co/storage/v1/object/public/avatars/u/avatar.jpg?v=999",
    );
  });

  it("works for relative-looking URLs without URL constructor", () => {
    const url = avatarProfileUrl("/storage/avatar.jpg", 5);
    expect(url).toBe("/storage/avatar.jpg?v=5");
  });
});
