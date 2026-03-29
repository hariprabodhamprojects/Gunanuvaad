import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_ACCEPT_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const DISPLAY_NAME_MAX_LEN = 80;

export function avatarExtFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

/** Returns an error message or null if valid. */
export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_ACCEPT_MIMES.includes(file.type as (typeof AVATAR_ACCEPT_MIMES)[number])) {
    return "Use a JPEG, PNG, WebP, or GIF image.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
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
    return { error: upErr.message };
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  return { publicUrl };
}
