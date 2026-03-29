"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, X } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { buttonVariants } from "@/components/ui/button";
import { SettingsPanel } from "@/components/settings-panel";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
  displayName: string;
  avatarUrl: string;
  totalScore: number;
  totalStreak: number;
  isOrganizer?: boolean;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export function AppMenu({
  email,
  displayName,
  avatarUrl,
  totalScore,
  totalStreak,
  isOrganizer = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const initials = initialsFromName(displayName);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen} modal>
      <Dialog.Trigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-10 rounded-full p-0 touch-manipulation",
        )}
        aria-label="Open profile and settings"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase public URL
          <img src={avatarUrl} alt={displayName} className="size-full rounded-full object-cover ring-1 ring-border/70" />
        ) : (
          <span className="flex size-full items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-border/70">
            {initials}
          </span>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]",
            "transition-opacity duration-200 ease-out",
            "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          )}
        />
        <Dialog.Viewport
          className={cn(
            "fixed inset-0 z-50 flex justify-end p-0 outline-none",
            "sm:justify-end sm:p-3",
          )}
        >
          <Dialog.Popup
            className={cn(
              "flex h-full w-[min(100vw,22rem)] max-h-[min(100dvh,100svh)] flex-col border-l border-border bg-popover shadow-2xl outline-none",
              "data-[ending-style]:translate-x-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-x-4 data-[starting-style]:opacity-0",
              "transition-[transform,opacity] duration-200 ease-out sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-l-xl sm:rounded-r-none",
            )}
          >
            <Dialog.Description className="sr-only">
              Profile details, appearance, notifications, and sign out.
            </Dialog.Description>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <Dialog.Title className="font-heading text-lg font-semibold tracking-tight">
                Profile
              </Dialog.Title>
              <Dialog.Close
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                  "shrink-0",
                )}
                aria-label="Close menu"
              >
                <X className="size-5" aria-hidden />
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="mb-5 rounded-xl border border-border/70 bg-muted/20 p-3.5">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase public URL
                    <img src={avatarUrl} alt={displayName} className="size-12 rounded-full object-cover ring-1 ring-border/70" />
                  ) : (
                    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border/70">
                      {initials}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Score</p>
                    <p className="font-heading text-lg font-semibold">{totalScore}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Streak</p>
                    <p className="font-heading text-lg font-semibold">{totalStreak}</p>
                  </div>
                </div>
                <Link
                  href="/me"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-3 w-full",
                  )}
                  onClick={() => setOpen(false)}
                >
                  View full profile
                </Link>
                {isOrganizer ? (
                  <Link
                    href="/admin"
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      "mt-2 w-full gap-2",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    <Shield className="size-4 shrink-0 opacity-80" aria-hidden />
                    Admin
                  </Link>
                ) : null}
              </div>
              <SettingsPanel email={email} />
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
