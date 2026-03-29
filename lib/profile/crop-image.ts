import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = src;
  });
}

/** Renders the cropped region to a JPEG blob (square crop from react-easy-crop pixel rect). */
export async function getCroppedAvatarBlob(
  imageSrc: string,
  pixelCrop: Area,
  maxSide = 640,
  quality = 0.9,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const { width: cw, height: ch } = pixelCrop;
  const scale = Math.min(1, maxSide / Math.max(cw, ch));
  const outW = Math.max(1, Math.round(cw * scale));
  const outH = Math.max(1, Math.round(ch * scale));
  canvas.width = outW;
  canvas.height = outH;

  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, cw, ch, 0, 0, outW, outH);

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
