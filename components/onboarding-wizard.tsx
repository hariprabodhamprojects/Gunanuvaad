"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AVATAR_PICK_ACCEPT_MIMES,
  validateAvatarFile,
  validateAvatarPick,
} from "@/lib/profile/avatar";
import { saveProfileAvatarAction } from "@/lib/profile/save-avatar-action";
import {
  getPermissionState,
  getPushSupportState,
  subscribeToPush,
  type PushSupportState,
} from "@/lib/notifications/web-push-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarCropModal } from "@/components/avatar-crop-modal";

type WizardStep = "photo" | "notifications";

export function OnboardingWizard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<WizardStep>("photo");
  const [src, setSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [support, setSupport] = useState<PushSupportState | null>(null);

  useEffect(() => {
    if (step !== "notifications") return;
    setSupport(getPushSupportState());
  }, [step]);

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

      if (getPermissionState() === "granted") {
        toast.success("You’re all set.");
        router.push("/home");
        router.refresh();
        return;
      }
      setStep("notifications");
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

  async function onEnableNotifications() {
    setEnabling(true);
    try {
      const result = await subscribeToPush();
      if (result.ok) {
        toast.success("Reminders are on. જય સ્વામિનારાયણ ✨");
      } else if (result.reason === "permission-denied") {
        toast.error(result.message ?? "Reminders are blocked in your browser.");
      } else if (result.reason !== "unsupported") {
        toast.error(result.message ?? "Couldn’t enable reminders.");
      }
    } finally {
      setEnabling(false);
      router.push("/home");
      router.refresh();
    }
  }

  function onSkipNotifications() {
    router.push("/home");
    router.refresh();
  }

  if (step === "notifications") {
    const iosNeedsInstall = support?.kind === "ios-needs-install";
    const unsupported = support?.kind === "unsupported";
    const cannotEnable = iosNeedsInstall || unsupported;

    return (
      <div className="glass-card w-full max-w-sm">
        <Card className="border-0 !bg-transparent shadow-none ring-0">
          <CardHeader className="pb-2 pt-8 text-center">
            <CardTitle className="font-heading text-2xl tracking-tight">
              Turn on reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-8 pt-2">
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              Five gentle nudges a day — write a daily note, share on the feed, and post your Swadhyay.
            </p>
            {iosNeedsInstall ? (
              <p className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-center text-xs leading-relaxed text-muted-foreground">
                On iPhone, tap <span className="font-medium">Share → Add to Home Screen</span> first, then open MananChintan from the new icon to turn on reminders.
              </p>
            ) : null}
            {unsupported ? (
              <p className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-center text-xs leading-relaxed text-muted-foreground">
                Your browser doesn’t support push notifications yet.
              </p>
            ) : null}
            <Button
              type="button"
              className="h-12 w-full rounded-xl text-base font-medium"
              size="lg"
              disabled={enabling || cannotEnable}
              onClick={onEnableNotifications}
            >
              {enabling ? "Turning on…" : "Turn on reminders"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 w-full"
              disabled={enabling}
              onClick={onSkipNotifications}
            >
              {cannotEnable ? "Continue" : "Maybe later"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
