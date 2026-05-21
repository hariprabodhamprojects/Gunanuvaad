"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog } from "@base-ui/react/dialog";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCroppedAvatarBlob } from "@/lib/profile/crop-image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    } catch {
      toast.error("Could not process that photo. Try another image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-[160] bg-black/50 backdrop-blur-[2px]",
            "transition-opacity duration-200 ease-out",
            "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          )}
        />
        <Dialog.Viewport
          className={cn(
            "fixed inset-0 z-[160] flex items-center justify-center outline-none",
            "p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6",
          )}
        >
          <Dialog.Popup
            className={cn(
              "flex w-full max-w-md max-h-[min(92dvh,40rem)] flex-col gap-3 overflow-y-auto overscroll-contain",
              "rounded-2xl border border-border bg-popover p-4 shadow-2xl outline-none sm:gap-4 sm:p-5",
              "data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
              "transition-[transform,opacity] duration-200 ease-out",
            )}
          >
            <Dialog.Title className="shrink-0 font-heading text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Description className="sr-only">
              Drag to reposition, use the slider to zoom, then save.
            </Dialog.Description>
            {imageSrc ? (
              <>
                <div className="relative h-[min(68vw,260px)] w-full shrink-0 overflow-hidden rounded-2xl bg-black/80 sm:h-[300px] md:h-[320px]">
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
                <div className="shrink-0 space-y-2">
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
                    className="h-8 w-full touch-pan-y accent-primary"
                  />
                </div>
                <div className="flex shrink-0 gap-2 pb-0.5">
                  <Dialog.Close
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "min-h-11 flex-1",
                    )}
                    disabled={busy}
                  >
                    Cancel
                  </Dialog.Close>
                  <Button
                    type="button"
                    className="min-h-11 flex-1"
                    disabled={busy || !pixels}
                    onClick={confirm}
                  >
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
