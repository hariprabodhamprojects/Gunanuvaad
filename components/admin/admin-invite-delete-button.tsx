"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteAllowlistUserByEmailAction } from "@/lib/admin/actions";

type Props = {
  email: string;
  isOrganizer: boolean;
};

function codeToMessage(code: string): string {
  switch (code) {
    case "cannot_delete_self":
      return "You cannot delete your own account.";
    case "last_organizer":
      return "Cannot delete the last organizer account.";
    case "not_found":
      return "User not found in invite list.";
    case "forbidden":
      return "Only organizers can delete users.";
    case "invalid_email":
      return "Invalid email.";
    case "rpc_error":
      return "Delete failed due to server error.";
    default:
      return "Delete failed.";
  }
}

export function AdminInviteDeleteButton({ email, isOrganizer }: Props) {
  const [deleted, setDeleted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (isOrganizer) {
    return <span className="text-xs text-muted-foreground">Protected</span>;
  }
  if (deleted) {
    return <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Deleted</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {confirming ? (
        <>
          <span className="text-xs text-muted-foreground">Are you sure?</span>
          <button
            type="button"
            className="inline-flex min-h-10 min-w-[2.75rem] touch-manipulation items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15 active:bg-destructive/20"
            onClick={() => {
              setDeleted(true);
              setConfirming(false);
              toast.success("User deleted from app access.");

              void deleteAllowlistUserByEmailAction(email).then((result) => {
                if (result.ok) return;
                setDeleted(false);
                setConfirming(true);
                toast.error(codeToMessage(result.code));
              });
            }}
          >
            OK
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 min-w-[2.75rem] touch-manipulation items-center justify-center rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-muted/80"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          className="inline-flex min-h-10 touch-manipulation items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15 active:bg-destructive/20"
          onClick={() => setConfirming(true)}
        >
          Delete
        </button>
      )}
    </div>
  );
}
