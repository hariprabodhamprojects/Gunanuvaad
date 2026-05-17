import type { Area } from "react-easy-crop";
import { AVATAR_MAX_BYTES } from "@/lib/profile/avatar";

async function loadBitmap(imageSrc: string): Promise<ImageBitmap> {
  const res = await fetch(imageSrc);
  const blob = await res.blob();
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return await createImageBitmap(blob);
  }
}

function drawCropToCanvas(bitmap: ImageBitmap, pixelCrop: Area, maxSide: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const { width: cw, height: ch } = pixelCrop;
  const scale = Math.min(1, maxSide / Math.max(cw, ch));
  const outW = Math.max(1, Math.round(cw * scale));
  const outH = Math.max(1, Math.round(ch * scale));
  canvas.width = outW;
  canvas.height = outH;

  ctx.drawImage(bitmap, pixelCrop.x, pixelCrop.y, cw, ch, 0, 0, outW, outH);
  return canvas;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create image"));
      },
      "image/jpeg",
      quality,
    );
  });
}

/** Renders the cropped region to a JPEG blob (square crop from react-easy-crop pixel rect). */
export async function getCroppedAvatarBlob(
  imageSrc: string,
  pixelCrop: Area,
  maxSide = 640,
): Promise<Blob> {
  const bitmap = await loadBitmap(imageSrc);
  try {
    const canvas = drawCropToCanvas(bitmap, pixelCrop, maxSide);
    const qualities = [0.92, 0.85, 0.75, 0.65, 0.55, 0.45] as const;
    let last: Blob | null = null;
    for (const q of qualities) {
      const blob = await canvasToJpegBlob(canvas, q);
      last = blob;
      if (blob.size <= AVATAR_MAX_BYTES) return blob;
    }
    if (last && last.size > 0) return last;
    throw new Error("Could not prepare photo.");
  } finally {
    bitmap.close();
  }
}
