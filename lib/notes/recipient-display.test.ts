import { describe, expect, it } from "vitest";
import {
  formatPublicDisplayName,
  resolveRecipientAvatarUrl,
  resolveRecipientName,
} from "@/lib/notes/recipient-display";

describe("resolveRecipientAvatarUrl", () => {
  it("prefers http avatar over logo placeholder", () => {
    const url = resolveRecipientAvatarUrl(
      { name: "A", avatarUrl: "/logo.png" },
      { name: "B", avatarUrl: "https://cdn.example.com/a.jpg" },
    );
    expect(url).toContain("https://cdn.example.com/a.jpg");
  });
});

describe("resolveRecipientName", () => {
  it("uses invite name from email map", () => {
    expect(resolveRecipientName(undefined, { name: "Khandan", avatarUrl: "" })).toBe("Khandan");
  });
});

describe("formatPublicDisplayName", () => {
  it("keeps a real display name", () => {
    expect(formatPublicDisplayName("Milan Patel")).toBe("Milan Patel");
  });

  it("never returns a raw email or derived local part", () => {
    expect(formatPublicDisplayName("milanrupapara89@gmail.com")).toBe("Someone");
    expect(formatPublicDisplayName("milanrupapara89@gmail.com")).not.toContain("@");
  });
});
