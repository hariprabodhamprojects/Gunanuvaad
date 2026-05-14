/** Public object URL for a row in the `smruti` storage bucket (`storage_path` is `{post_id}/{file}`). */
export function smrutiPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const segments = storagePath.split("/").filter(Boolean).map((s) => encodeURIComponent(s));
  return `${base}/storage/v1/object/public/smruti/${segments.join("/")}`;
}

/** Parchment matte behind feed photos — fills letterboxing when using `object-contain`. */
export const SMRUTI_PHOTO_MATTE_URL = "/images/smruti-photo-matte.png";
