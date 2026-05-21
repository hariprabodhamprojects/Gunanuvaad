"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AVATAR_PICK_ACCEPT_MIMES,
  validateAvatarFile,
  validateAvatarPick,
} from "@/lib/profile/avatar";
import { saveProfileAvatarAction } from "@/lib/profile/save-avatar-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarCropModal } from "@/components/avatar-crop-modal";
import { toast } from "sonner";

export function OnboardingWizard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const err = validateAvatarPick(f);
    if (err) {
      toast.error(err);
      return;
    }
    setSrc(URL.createObjectURL(f));
    setCropOpen(true);
  }

  async function onCropped(file: File) {
    const err = validateAvatarFile(file);
    if (err) {
      toast.error(err);
      return;
    }

    setBusy(true);
    try {
      const result = await saveProfileAvatarAction(file);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      if (src) URL.revokeObjectURL(src);
      setSrc(null);
      toast.success("You’re all set.");
      router.push("/home");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onCropOpenChange(open: boolean) {
    setCropOpen(open);
    if (!open && src) {
      URL.revokeObjectURL(src);
      setSrc(null);
    }
  }

  return (
    <div className="glass-card w-full max-w-sm">
      <Card className="border-0 !bg-transparent shadow-none ring-0">
        <CardHeader className="pb-4 pt-8 text-center">
          <CardTitle className="font-heading text-2xl tracking-tight">Profile photo</CardTitle>
        </CardHeader>
        <CardContent className="pb-8 pt-0">
          <input
            ref={inputRef}
            type="file"
            accept={[...AVATAR_PICK_ACCEPT_MIMES, "image/*"].join(",")}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            disabled={busy}
            onChange={onPickImage}
          />
          <Button
            type="button"
            className="h-12 w-full rounded-xl text-base font-medium"
            size="lg"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Saving…" : "Choose photo"}
          </Button>
        </CardContent>
      </Card>
      <AvatarCropModal
        imageSrc={src}
        open={cropOpen && Boolean(src)}
        onOpenChange={onCropOpenChange}
        title="Adjust photo"
        onCropped={onCropped}
      />
    </div>
  );
}
