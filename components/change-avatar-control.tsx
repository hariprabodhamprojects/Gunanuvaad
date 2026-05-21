"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AVATAR_PICK_ACCEPT_MIMES,
  persistUserAvatar,
  validateAvatarFile,
  validateAvatarPick,
} from "@/lib/profile/avatar";
import { revalidateAppProfileCaches } from "@/lib/profile/revalidate-profile";
import { Button } from "@/components/ui/button";
import { AvatarCropModal } from "@/components/avatar-crop-modal";
import { toast } from "sonner";

type Props = {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
  /** Called with the saved profile URL (includes cache-bust param) for instant UI updates. */
  onAvatarUpdated?: (profileAvatarUrl: string) => void;
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
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        toast.error("Your session expired. Sign in again.");
        return;
      }
      const result = await persistUserAvatar(supabase, user.id, file);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      onAvatarUpdated?.(result.profileAvatarUrl);
      await revalidateAppProfileCaches();
      toast.success("Photo updated.");
      if (src) URL.revokeObjectURL(src);
      setSrc(null);
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
