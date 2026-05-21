"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { addAllowlistUserAction } from "@/lib/admin/actions";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function codeToMessage(code: string): string {
  switch (code) {
    case "invalid_email":
      return "Enter a valid email address.";
    case "forbidden":
      return "Only organizers can add invites.";
    case "rpc_error":
      return "Could not save invite. Try again.";
    default:
      return "Could not add invite.";
  }
}

export function AdminInviteAddDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  function resetForm() {
    setEmail("");
    setFirstName("");
    setLastName("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await addAllowlistUserAction({
      email,
      firstName,
      lastName,
    });
    setPending(false);

    if (!result.ok) {
      toast.error(codeToMessage(result.code));
      return;
    }

    const label =
      result.code === "updated"
        ? "Invite updated (email was already on the list)."
        : "Invite added to the list.";
    toast.success(label);
    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
      modal
    >
      <Dialog.Trigger
        className={cn(
          buttonVariants({ variant: "default", size: "default" }),
          "h-11 shrink-0 gap-2 rounded-xl px-4 touch-manipulation sm:h-12",
        )}
      >
        <Plus className="size-4" aria-hidden />
        Add invite
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]",
            "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            "transition-opacity duration-[220ms] ease-[var(--ease-out-standard)]",
          )}
        />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <Dialog.Popup
            className={cn(
              "w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-xl outline-none",
              "data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0",
              "data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
              "transition-[transform,opacity] duration-300 ease-[var(--ease-out-standard)]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="font-heading text-xl font-semibold text-primary">
                  Add invite
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  They can sign in with this email on the Harmony With Hearts Google account.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "shrink-0")}
                aria-label="Close"
              >
                <X className="size-5" aria-hidden />
              </Dialog.Close>
            </div>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-first-name">First name</Label>
                  <Input
                    id="invite-first-name"
                    name="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-last-name">Last name</Label>
                  <Input
                    id="invite-last-name"
                    name="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                  placeholder="name@example.com"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Dialog.Close
                  type="button"
                  className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl")}
                >
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "h-11 rounded-xl px-6",
                  )}
                >
                  {pending ? "Saving…" : "Add to list"}
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
