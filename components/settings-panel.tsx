"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getPermissionState,
  getPushSupportState,
  reconcileSubscriptionSilently,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermissionState,
  type PushSupportState,
} from "@/lib/notifications/web-push-client";

type Props = {
  email?: string;
  /** Hide the email line (e.g. when shown on the profile card above). @default true */
  showEmail?: boolean;
};

export function SettingsPanel({ email, showEmail = true }: Props) {
  const { theme, setTheme } = useTheme();
  const mounted = theme !== undefined;
  const darkEnabled = theme === "dark";

  const [support, setSupport] = useState<PushSupportState | null>(null);
  const [permission, setPermission] = useState<PushPermissionState>("unsupported");
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  // Resolve push state once on mount and keep it in sync with the OS — the
  // browser doesn't fire an event when the user revokes permission from
  // settings, but re-querying on focus catches it the next time they look.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      setSupport(getPushSupportState());
      setPermission(getPermissionState());
    };
    sync();
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const switchDisabled =
    busy ||
    support === null ||
    support.kind === "unsupported" ||
    support.kind === "ios-needs-install" ||
    permission === "denied";

  const checked = support?.kind === "supported" && permission === "granted";

  async function onToggle(next: boolean) {
    if (switchDisabled) return;
    setBusy(true);
    try {
      if (next) {
        const result = await subscribeToPush();
        if (result.ok) {
          setPermission("granted");
          toast.success("Reminders are on. જય સ્વામિનારાયણ ✨");
        } else {
          if (result.reason === "permission-denied") setPermission("denied");
          toast.error(result.message ?? "Couldn't enable reminders.");
        }
      } else {
        const result = await unsubscribeFromPush();
        if (result.ok) {
          toast("Reminders paused.");
        } else {
          toast.error(result.message);
        }
      }
    } finally {
      // Re-sync permission/support after the OS prompt closes.
      setSupport(getPushSupportState());
      setPermission(getPermissionState());
      setBusy(false);
      if (next) void reconcileSubscriptionSilently();
    }
  }

  async function sendTestNotification() {
    setTestBusy(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: "morning-note" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        devices?: number;
      };
      if (res.status === 404) {
        toast.error(
          "Push test API not found — deploy the latest app to Vercel first, then try again.",
        );
        return;
      }
      if (res.ok && data.ok) {
        toast.success("Test sent — check your notification tray.");
      } else if (data.error === "no-subscription") {
        toast.error(
          data.message ??
            "No subscription saved. Turn Daily reminders off, then on again. iPhone: use the Home Screen app.",
        );
      } else {
        toast.error(data.message ?? data.error ?? `Test failed (${res.status}).`);
      }
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-2">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="switch-theme" className="text-sm font-medium leading-snug">
            Dark mode
          </Label>
          <Switch
            id="switch-theme"
            checked={darkEnabled}
            disabled={!mounted}
            onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="switch-notifications" className="text-sm font-medium leading-snug">
              Daily reminders
            </Label>
            <Switch
              id="switch-notifications"
              checked={checked}
              disabled={switchDisabled}
              onCheckedChange={onToggle}
            />
          </div>
          <NotificationsHint support={support} permission={permission} enabled={checked} />
          {checked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 w-full"
              disabled={testBusy || busy}
              onClick={sendTestNotification}
            >
              {testBusy ? "Sending…" : "Send test notification"}
            </Button>
          ) : null}
        </div>
      </div>

      {showEmail && email ? (
        <p className="truncate text-xs text-muted-foreground" title={email}>
          {email}
        </p>
      ) : null}

      <div className="pt-1">
        <SignOutButton className="w-full min-h-10" />
      </div>
    </div>
  );
}

function NotificationsHint({
  support,
  permission,
  enabled,
}: {
  support: PushSupportState | null;
  permission: PushPermissionState;
  enabled: boolean;
}) {
  if (support === null) return null;
  if (support.kind === "ios-needs-install") {
    return (
      <p className="text-xs text-muted-foreground">
        Add MananChintan to your Home Screen first (Share → Add to Home Screen), then turn this on.
      </p>
    );
  }
  if (support.kind === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        Reminders aren&rsquo;t supported in this browser yet.
      </p>
    );
  }
  if (permission === "denied") {
    return (
      <p className="text-xs text-muted-foreground">
        Reminders are blocked. Allow notifications in your browser settings to turn them on.
      </p>
    );
  }
  if (enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        5 gentle nudges a day — notes, feed, and Swadhyay.
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      A few small reminders so the daily note doesn&rsquo;t slip past.
    </p>
  );
}
