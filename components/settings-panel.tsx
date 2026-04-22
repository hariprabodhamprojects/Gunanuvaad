"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  readNotificationsPreference,
  writeNotificationsPreference,
} from "@/lib/settings/notifications-preference";

type Props = {
  email?: string;
  /** Hide the email line (e.g. when shown on the profile card above). @default true */
  showEmail?: boolean;
};

export function SettingsPanel({ email, showEmail = true }: Props) {
  const { theme, setTheme } = useTheme();
  const mounted = theme !== undefined;
  const [notifications, setNotifications] = useState(() => readNotificationsPreference());

  const darkEnabled = theme === "dark";

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
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="switch-notifications" className="text-sm font-medium leading-snug">
            Notifications
          </Label>
          <Switch
            id="switch-notifications"
            checked={notifications}
            onCheckedChange={(on) => {
              setNotifications(on);
              writeNotificationsPreference(on);
            }}
          />
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
