/**
 * Re-encode photos in the browser before Server Actions upload.
 * Vercel / Next.js reject large multipart bodies (413); phone camera files are often multi‑MB each.
 */

const MAX_EDGE_START = 2048;
const TARGET_BYTES = 720_000;
const JPEG_QUALITIES = [0.88, 0.82, 0.75, 0.68, 0.6, 0.52, 0.45, 0.38] as const;

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return await createImageBitmap(file);
  }
}

async function bitmapToJpegUnderTarget(
  bitmap: ImageBitmap,
  maxEdge: number,
  filename: string,
): Promise<File> {
  const { width: iw, height: ih } = bitmap;
  let edge = Math.min(maxEdge, Math.max(iw, ih));

  for (let round = 0; round < 10; round++) {
    const scale = Math.min(1, edge / Math.max(iw, ih));
    const tw = Math.max(1, Math.round(iw * scale));
    const th = Math.max(1, Math.round(ih * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not prepare image.");
    }
    ctx.drawImage(bitmap, 0, 0, tw, th);

    for (const q of JPEG_QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", q);
      });
      if (blob && blob.size > 0 && blob.size <= TARGET_BYTES) {
        return new File([blob], filename, { type: "image/jpeg", lastModified: Date.now() });
      }
    }

    edge = Math.round(edge * 0.82);
    if (edge < 480) break;
  }

  const scale = Math.min(1, 480 / Math.max(iw, ih));
  const tw = Math.max(1, Math.round(iw * scale));
  const th = Math.max(1, Math.round(ih * scale));
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare image.");
  }
  ctx.drawImage(bitmap, 0, 0, tw, th);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.35);
  });
  if (!blob || blob.size === 0) {
    throw new Error("Could not compress image enough to upload.");
  }
  if (blob.size > TARGET_BYTES * 2) {
    throw new Error("One photo is still too large. Try fewer photos or simpler images.");
  }
  return new File([blob], filename, { type: "image/jpeg", lastModified: Date.now() });
}

/**
 * Returns JPEGs (or original tiny GIF) suitable for `createSmrutiPostAction` FormData.
 */
export async function compressSmrutiPhotosForUpload(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const name = `photo-${i + 1}.jpg`;

    if (file.type === "image/gif") {
      if (file.size <= TARGET_BYTES) {
        out.push(file);
        continue;
      }
      const bitmap = await loadBitmap(file);
      try {
        out.push(await bitmapToJpegUnderTarget(bitmap, MAX_EDGE_START, name));
      } finally {
        bitmap.close();
      }
      continue;
    }

    if (file.type === "image/jpeg" && file.size <= TARGET_BYTES) {
      out.push(file);
      continue;
    }

    if (
      file.type !== "image/jpeg" &&
      file.type !== "image/png" &&
      file.type !== "image/webp"
    ) {
      out.push(file);
      continue;
    }

    const bitmap = await loadBitmap(file);
    try {
      out.push(await bitmapToJpegUnderTarget(bitmap, MAX_EDGE_START, name));
    } finally {
      bitmap.close();
    }
  }
  return out;
}
