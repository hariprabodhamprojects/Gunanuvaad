"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { buttonVariants } from "@/components/ui/button";
import { SettingsPanel } from "@/components/settings-panel";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
};

export function AppMenu({ email }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen} modal>
      <Dialog.Trigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "touch-manipulation",
        )}
        aria-label="Open menu"
      >
        <Menu className="size-5" aria-hidden />
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
              Appearance, notifications, and sign out.
            </Dialog.Description>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <Dialog.Title className="font-heading text-lg font-semibold tracking-tight">
                Menu
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
              <SettingsPanel email={email} />
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
