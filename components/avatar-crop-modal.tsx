"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog } from "@base-ui/react/dialog";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCroppedAvatarBlob } from "@/lib/profile/crop-image";
import { cn } from "@/lib/utils";

type Props = {
  imageSrc: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropped: (file: File) => void | Promise<void>;
  title?: string;
};

export function AvatarCropModal({
  imageSrc,
  open,
  onOpenChange,
  onCropped,
  title = "Adjust photo",
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setPixels(croppedAreaPixels);
  }, []);

  useEffect(() => {
    if (open && imageSrc) {
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setPixels(null);
    }
  }, [open, imageSrc]);

  async function confirm() {
    if (!imageSrc || !pixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedAvatarBlob(imageSrc, pixels);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      await onCropped(file);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]",
            "transition-opacity duration-200 ease-out",
            "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          )}
        />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-0 outline-none sm:items-center sm:p-4">
          <Dialog.Popup
            className={cn(
              "flex w-full max-w-md flex-col gap-4 rounded-t-2xl border border-border bg-popover p-5 shadow-2xl outline-none sm:rounded-2xl",
              "data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0",
              "transition-[transform,opacity] duration-200 ease-out",
            )}
          >
            <Dialog.Title className="font-heading text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Description className="sr-only">
              Drag to reposition, use the slider to zoom, then save.
            </Dialog.Description>
            {imageSrc ? (
              <>
                <div className="relative h-[min(85vw,340px)] w-full overflow-hidden rounded-2xl bg-black/80 sm:h-[320px]">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="avatar-zoom">
                    Zoom
                  </label>
                  <input
                    id="avatar-zoom"
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <Dialog.Close
                    className={cn(buttonVariants({ variant: "outline", size: "default" }), "flex-1")}
                    disabled={busy}
                  >
                    Cancel
                  </Dialog.Close>
                  <Button type="button" className="flex-1" disabled={busy || !pixels} onClick={confirm}>
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                        Saving…
                      </>
                    ) : (
                      "Use photo"
                    )}
                  </Button>
                </div>
              </>
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
