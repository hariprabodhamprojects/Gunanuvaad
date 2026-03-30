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
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 shadow-[inset_0_2px_10px_rgba(250,115,22,0.1)] relative overflow-hidden group transform-gpu transition-transform hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-primary/80 mb-1 flex items-center gap-1"><span aria-hidden>🏆</span> Score</p>
                    <p className="font-heading text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-orange-300 drop-shadow-sm">{totalScore}</p>
                  </div>
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-3 shadow-[inset_0_2px_10px_rgba(239,68,68,0.1)] relative overflow-hidden group transform-gpu transition-transform hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-red-500/80 mb-1 flex items-center gap-1"><span aria-hidden>🔥</span> Streak</p>
                    <p className="font-heading text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-red-300 drop-shadow-sm">{totalStreak}</p>
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
                    href="/admin/invites"
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
