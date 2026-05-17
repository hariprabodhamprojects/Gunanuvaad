import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_ACCEPT_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Accepted when picking from the library (includes HEIC; output is always JPEG). */
export const AVATAR_PICK_ACCEPT_MIMES = [
  ...AVATAR_ACCEPT_MIMES,
  "image/heic",
  "image/heif",
] as const;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const DISPLAY_NAME_MAX_LEN = 80;

const EXT_TO_MIME: Record<string, (typeof AVATAR_ACCEPT_MIMES)[number]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function extFromName(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** Best-effort MIME for uploads (JPEG/PNG/WebP/GIF only). */
export function resolveAvatarMime(file: File): string | null {
  const t = (file.type ?? "").toLowerCase();
  if (AVATAR_ACCEPT_MIMES.includes(t as (typeof AVATAR_ACCEPT_MIMES)[number])) {
    return t;
  }
  const fromExt = EXT_TO_MIME[extFromName(file.name)];
  if (fromExt) return fromExt;
  if (!t || t === "application/octet-stream") return fromExt ?? null;
  return null;
}

/** Pick step — no file-size gate (phone exports vary; crop/compress runs next). */
export function validateAvatarPick(file: File): string | null {
  const t = (file.type ?? "").toLowerCase();
  if (AVATAR_PICK_ACCEPT_MIMES.includes(t as (typeof AVATAR_PICK_ACCEPT_MIMES)[number])) {
    return null;
  }
  if (resolveAvatarMime(file)) return null;
  const ext = extFromName(file.name);
  if (["heic", "heif"].includes(ext)) return null;
  if (t.startsWith("image/")) return null;
  return "Choose a JPEG, PNG, WebP, or GIF photo.";
}

/** Returns an error message or null if valid (final JPEG after crop). */
export function validateAvatarFile(file: File): string | null {
  const mime = resolveAvatarMime(file) ?? (file.type === "image/jpeg" ? "image/jpeg" : null);
  if (!mime || !AVATAR_ACCEPT_MIMES.includes(mime as (typeof AVATAR_ACCEPT_MIMES)[number])) {
    return "Use a JPEG, PNG, WebP, or GIF image.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "Image is too large after processing. Try a different photo or zoom out slightly.";
  }
  return null;
}

export function avatarExtFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function uploadUserAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ publicUrl: string } | { error: string }> {
  const ext = avatarExtFromMime(file.type);
  const path = `${userId}/avatar.${ext}`;
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (upErr) {
    const msg = upErr.message.toLowerCase();
    if (msg.includes("size") || msg.includes("large") || msg.includes("payload")) {
      return { error: "Photo is too large to upload. Try again or pick a different image." };
    }
    return { error: upErr.message };
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  return { publicUrl };
}
