import { avatarProfileUrl } from "@/lib/profile/avatar";

/** Strip query/hash so we can re-apply a fresh cache-bust param (PWA / mobile HTTP cache). */
export function avatarUrlBase(storedUrl: string): string {
  return storedUrl.split("#")[0]?.split("?")[0]?.trim() ?? storedUrl.trim();
}

/**
 * URL for <img src> — always includes a version param derived from profile `updated_at`
 * so phones and PWAs do not keep showing a cached image at the same storage path.
 */
export function displayAvatarUrl(
  storedUrl: string | null | undefined,
  updatedAt?: string | null,
): string | null {
  const raw = storedUrl?.trim();
  if (!raw) return null;
  if (!raw.startsWith("http")) return raw;

  const base = avatarUrlBase(raw);
  const version = updatedAt ? String(new Date(updatedAt).getTime()) : String(Date.now());
  return avatarProfileUrl(base, version);
}
