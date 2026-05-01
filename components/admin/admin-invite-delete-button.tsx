"use client";

import { useState, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
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
            disabled={pending}
            className="inline-flex items-center rounded-md border border-destructive/50 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              startTransition(async () => {
                const result = await deleteAllowlistUserByEmailAction(email);
                if (result.ok) {
                  setDeleted(true);
                  toast.success("User deleted from app access.");
                  return;
                }
                toast.error(codeToMessage(result.code));
                setConfirming(false);
              });
            }}
          >
            {pending ? "Deleting..." : "OK"}
          </button>
          <button
            type="button"
            disabled={pending}
            className="inline-flex items-center rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          className="inline-flex items-center rounded-md border border-destructive/50 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => setConfirming(true)}
        >
          Delete
        </button>
      )}
    </div>
  );
}
