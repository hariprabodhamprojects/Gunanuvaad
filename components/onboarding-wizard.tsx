"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AVATAR_ACCEPT_MIMES,
  uploadUserAvatar,
  validateAvatarFile,
} from "@/lib/profile/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    const err = validateAvatarFile(f);
    if (err) {
      toast.error(err);
      return;
    }
    setSrc(URL.createObjectURL(f));
    setCropOpen(true);
  }

  async function onCropped(file: File) {
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

      const up = await uploadUserAvatar(supabase, user.id, file);
      if ("error" in up) {
        toast.error(up.error);
        return;
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          avatar_url: up.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profErr) {
        toast.error(profErr.message);
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
    <div className="glass-card w-full max-w-md">
      <Card className="border-0 !bg-transparent shadow-none ring-0">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl tracking-tight">Profile photo</CardTitle>
          <CardDescription>
            Choose a photo, crop it, and upload. Your name comes from the invite list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT_MIMES.join(",")}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            disabled={busy}
            onChange={onPickImage}
          />
          <div className="space-y-2">
            <Label>Photo</Label>
            <p className="text-sm text-muted-foreground">
              Pick an image, then crop and zoom before it&apos;s saved.
            </p>
          </div>
          <Button
            type="button"
            className="w-full"
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
