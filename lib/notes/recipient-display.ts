import { displayAvatarUrl } from "@/lib/profile/avatar-display";

const LOGO = "/logo.png";

type RecipientEntry = { name: string; avatarUrl: string };

/** Prefer a real uploaded photo over the invite placeholder. */
export function resolveRecipientAvatarUrl(
  byId?: RecipientEntry,
  byEmail?: RecipientEntry,
): string {
  for (const entry of [byId, byEmail]) {
    const raw = entry?.avatarUrl?.trim();
    if (raw?.startsWith("http")) {
      return displayAvatarUrl(raw) ?? raw;
    }
  }
  return LOGO;
}

export function resolveRecipientName(
  byId?: RecipientEntry,
  byEmail?: RecipientEntry,
  emailFallback?: string | null,
): string {
  const name = byId?.name?.trim() || byEmail?.name?.trim();
  if (name) return name;
  const email = emailFallback?.trim();
  if (!email) return "Someone";
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return local || email;
}

/**
 * Spotlight / public cards: only show a real name from the DB (profile or
 * allowlist display_name). Never show an email or a derived local-part label.
 */
export function formatPublicDisplayName(raw: string | null | undefined, fallback = "Someone"): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed.includes("@")) return fallback;
  return trimmed;
}
