"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { DialogCampaignTeaser } from "@/components/notes/campaign-day-ux";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getRecipientWriteEligibility,
  submitDailyNote,
  type WriteEligibility,
} from "@/lib/notes/daily-note-actions";
import { NOTE_BODY_MAX_LEN, RECIPIENT_LOCK_K } from "@/lib/campaign-spec";
import type { DailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
import type { RosterMember } from "@/lib/roster/types";
import { cn } from "@/lib/utils";

type Props = {
  member: RosterMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  dailyCampaignStatus: DailyCampaignStatus;
};

function eligibilityHint(elig: WriteEligibility | null): string | null {
  if (!elig || elig.ok) return null;
  switch (elig.code) {
    case "already_today":
      return "You already sent today’s note. Come back tomorrow.";
    case "recipient_locked": {
      const n = elig.need_more ?? RECIPIENT_LOCK_K;
      return `Appreciate ${n} more ${n === 1 ? "person" : "people"} before you can choose this person again.`;
    }
    case "invalid_recipient":
    case "self":
      return "You can’t send a note to this person from here.";
    case "not_allowed":
    case "rpc_error":
      return "Couldn’t check whether you can send a note. Try again.";
    default:
      return "You can’t send a note right now.";
  }
}

export function RosterPersonDialog({
  member,
  open,
  onOpenChange,
  currentUserId,
  dailyCampaignStatus,
}: Props) {
  const router = useRouter();
  const isSelf = member?.id === currentUserId;
  const [elig, setElig] = useState<WriteEligibility | null>(null);
  const [loadingElig, setLoadingElig] = useState(false);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setBody("");
      setElig(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !member || isSelf) {
      setLoadingElig(false);
      return;
    }
    let cancelled = false;
    setLoadingElig(true);
    setElig(null);
    getRecipientWriteEligibility(member.id).then((r) => {
      if (!cancelled) {
        setElig(r ?? { ok: false, code: "rpc_error" });
        setLoadingElig(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, member?.id, isSelf]);

  const canWrite = elig?.ok === true;
  const blockHint = eligibilityHint(elig);
  const trimmedLen = body.trim().length;
  const lengthOk = trimmedLen >= 1 && trimmedLen <= NOTE_BODY_MAX_LEN;

  const onSubmit = () => {
    if (!member || isSelf || !canWrite || !lengthOk) return;
    startTransition(async () => {
      const r = await submitDailyNote(member.id, body);
      if (r.ok) {
        toast.success("Your note is sent.");
        setBody("");
        onOpenChange(false);
        router.refresh();
        return;
      }
      if (r.code === "invalid_body") {
        toast.error(`Use between 1 and ${NOTE_BODY_MAX_LEN} characters.`);
        return;
      }
      if (r.code === "already_today") {
        toast.error("You already sent today’s note.");
        setElig({ ok: false, code: "already_today" });
        return;
      }
      if (r.code === "recipient_locked") {
        const n = r.need_more ?? RECIPIENT_LOCK_K;
        toast.error(`Appreciate ${n} more ${n === 1 ? "person" : "people"} first.`);
        setElig({ ok: false, code: "recipient_locked", need_more: r.need_more });
        return;
      }
      toast.error("Couldn’t send your note. Try again.");
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]",
            "transition-opacity duration-200 ease-out",
            "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          )}
        />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-0 outline-none sm:items-center sm:p-4">
          <Dialog.Popup
            className={cn(
              "flex max-h-[min(90dvh,90svh)] w-full max-w-md flex-col gap-5 rounded-t-2xl border border-border bg-popover p-6 shadow-2xl outline-none sm:rounded-2xl",
              "data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0",
              "transition-[transform,opacity] duration-200 ease-out",
            )}
          >
            <Dialog.Title className="sr-only">
              {member ? `${member.display_name}` : "Person"}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {isSelf ? "You cannot select yourself." : "Send a note or view status"}
            </Dialog.Description>
            {member ? (
              <>
                {!isSelf ? <DialogCampaignTeaser status={dailyCampaignStatus} /> : null}
                <div className="flex flex-col items-center gap-3 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.avatar_url}
                    alt=""
                    className="size-24 rounded-full object-cover ring-2 ring-border shadow-md sm:size-28"
                  />
                  <p className="font-heading text-xl font-semibold">{member.display_name}</p>
                </div>
                {isSelf ? (
                  <div
                    className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-5 text-center"
                    role="status"
                  >
                    <Lock className="size-7 text-muted-foreground" aria-hidden />
                    <p className="text-sm font-medium text-foreground">That&apos;s you</p>
                  </div>
                ) : loadingElig ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin" aria-hidden />
                    <p className="text-sm">Checking…</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {blockHint ? (
                      <p className="rounded-xl border border-border/70 bg-muted/25 px-3 py-3 text-center text-sm text-muted-foreground">
                        {blockHint}
                      </p>
                    ) : null}
                    {canWrite ? (
                      <>
                        <div className="space-y-2">
                          <label htmlFor="daily-note-body" className="sr-only">
                            Your note
                          </label>
                          <Textarea
                            id="daily-note-body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Write something kind…"
                            maxLength={NOTE_BODY_MAX_LEN}
                            disabled={pending}
                            className="resize-y"
                            aria-describedby="daily-note-counter"
                          />
                          <p
                            id="daily-note-counter"
                            className="text-right text-xs text-muted-foreground"
                          >
                            {body.length}/{NOTE_BODY_MAX_LEN}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="lg"
                          className="w-full"
                          disabled={pending || !lengthOk}
                          onClick={onSubmit}
                        >
                          {pending ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                              Sending…
                            </>
                          ) : (
                            <>Send to {member.display_name.split(" ")[0]}</>
                          )}
                        </Button>
                      </>
                    ) : null}
                  </div>
                )}
                <Dialog.Close
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
                >
                  Close
                </Dialog.Close>
              </>
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
