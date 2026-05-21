import type { SupabaseClient } from "@supabase/supabase-js";
import { displayAvatarUrl } from "@/lib/profile/avatar-display";

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

/** Profile + img src URL — busts browser/CDN cache after re-uploading the same storage path. */
export function avatarProfileUrl(publicUrl: string, version: number | string = Date.now()): string {
  const v = String(version);
  try {
    const u = new URL(publicUrl);
    u.searchParams.set("v", v);
    return u.toString();
  } catch {
    const base = publicUrl.split("?")[0] ?? publicUrl;
    return `${base}?v=${encodeURIComponent(v)}`;
  }
}

function avatarObjectPath(userId: string, ext: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${userId}/avatar-${id}.${ext}`;
}

/** Remove prior avatar objects for this user (best-effort; does not block upload). */
async function removePriorAvatarObjects(
  supabase: SupabaseClient,
  userId: string,
  keepPath?: string,
): Promise<void> {
  const { data: existing, error: listErr } = await supabase.storage.from("avatars").list(userId, {
    limit: 100,
  });
  if (listErr || !existing?.length) return;

  const toRemove = existing
    .map((f) => (f.name ? `${userId}/${f.name}` : null))
    .filter((p): p is string => Boolean(p && p !== keepPath));

  if (toRemove.length === 0) return;
  await supabase.storage.from("avatars").remove(toRemove);
}

export async function uploadUserAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ publicUrl: string; storagePath: string } | { error: string }> {
  const ext = avatarExtFromMime(file.type);
  const path = avatarObjectPath(userId, ext);

  const { data: uploaded, error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "0",
  });

  if (upErr) {
    const msg = upErr.message.toLowerCase();
    if (msg.includes("size") || msg.includes("large") || msg.includes("payload")) {
      return { error: "Photo is too large to upload. Try again or pick a different image." };
    }
    return { error: upErr.message };
  }

  const storagePath = uploaded?.path ?? path;
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(storagePath);

  await removePriorAvatarObjects(supabase, userId, storagePath);

  return { publicUrl, storagePath };
}

/** Upload to storage, save versioned URL on profile, and confirm the row updated. */
export async function persistUserAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ profileAvatarUrl: string } | { error: string }> {
  const up = await uploadUserAvatar(supabase, userId, file);
  if ("error" in up) return up;

  const updatedAt = new Date().toISOString();
  const profileAvatarUrl = avatarProfileUrl(up.publicUrl, updatedAt);
  const { data, error: profErr } = await supabase
    .from("profiles")
    .update({
      avatar_url: profileAvatarUrl,
      updated_at: updatedAt,
    })
    .eq("id", userId)
    .select("avatar_url, updated_at")
    .single();

  if (profErr) {
    return { error: profErr.message };
  }
  const saved = data?.avatar_url?.trim();
  if (!saved) {
    return { error: "Profile photo could not be saved. Try again." };
  }
  return { profileAvatarUrl: displayAvatarUrl(saved, data.updated_at) ?? saved };
}
