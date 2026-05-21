"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AVATAR_PICK_ACCEPT_MIMES,
  validateAvatarFile,
  validateAvatarPick,
} from "@/lib/profile/avatar";
import { saveProfileAvatarAction } from "@/lib/profile/save-avatar-action";
import { notifyProfileAvatarUpdated } from "@/lib/profile/use-fresh-profile-avatar";
import { Button } from "@/components/ui/button";
import { AvatarCropModal } from "@/components/avatar-crop-modal";
import { toast } from "sonner";

type Props = {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
  /** Called with the saved profile URL (includes cache-bust param) for instant UI updates. */
  onAvatarUpdated?: (profileAvatarUrl: string | null) => void;
};

export function ChangeAvatarControl({
  variant = "outline",
  size = "sm",
  className,
  label = "Change photo",
  onAvatarUpdated,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
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
    const previewUrl = URL.createObjectURL(file);
    onAvatarUpdated?.(previewUrl);
    setBusy(true);
    try {
      const result = await saveProfileAvatarAction(file);
      if ("error" in result) {
        toast.error(result.error);
        onAvatarUpdated?.(null);
        return;
      }
      onAvatarUpdated?.(result.profileAvatarUrl);
      notifyProfileAvatarUpdated(result.profileAvatarUrl);
      toast.success("Photo updated.");
      if (src) URL.revokeObjectURL(src);
      setSrc(null);
      router.refresh();
    } finally {
      URL.revokeObjectURL(previewUrl);
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
    <>
      <input
        ref={inputRef}
        type="file"
        accept={[...AVATAR_PICK_ACCEPT_MIMES, "image/*"].join(",")}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onPick}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Saving…" : label}
      </Button>
      <AvatarCropModal
        imageSrc={src}
        open={cropOpen && Boolean(src)}
        onOpenChange={onCropOpenChange}
        title="Adjust photo"
        onCropped={onCropped}
      />
    </>
  );
}
