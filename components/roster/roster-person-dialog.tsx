"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { DialogCampaignTeaser } from "@/components/notes/campaign-day-ux";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getRecipientWriteEligibility,
  submitDailyNote,
  type WriteEligibility,
} from "@/lib/notes/daily-note-actions";
import { NOTE_BODY_MAX_LEN, NOTE_BODY_MIN_LEN } from "@/lib/campaign-spec";
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
  const recipientId = member?.recipient_id ?? null;
  const isSelf = recipientId === currentUserId;
  const [elig, setElig] = useState<WriteEligibility | null>(null);
  const [loadingElig, setLoadingElig] = useState(false);
  const [body, setBody] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setBody("");
      setElig(null);
      setShowConfirm(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !member || !recipientId || isSelf) {
      setLoadingElig(false);
      return;
    }
    let cancelled = false;
    setLoadingElig(true);
    setElig(null);
    getRecipientWriteEligibility(recipientId).then((r) => {
      if (!cancelled) {
        setElig(r ?? { ok: false, code: "rpc_error" });
        setLoadingElig(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, member?.id, recipientId, isSelf]);

  const canWrite = elig?.ok === true;
  const blockHint = eligibilityHint(elig);
  const trimmedLen = body.trim().length;
  const lengthOk =
    trimmedLen >= NOTE_BODY_MIN_LEN && trimmedLen <= NOTE_BODY_MAX_LEN;

  const onSubmit = () => {
    if (!member || !recipientId || isSelf || !canWrite || !lengthOk) return;
    startTransition(async () => {
      const r = await submitDailyNote(recipientId, body);
      if (r.ok) {
        toast.success("Your note is sent.");
        setBody("");
        setShowConfirm(false);
        onOpenChange(false);
        router.refresh();
        return;
      }
      if (r.code === "invalid_body") {
        toast.error(
          `Use between ${NOTE_BODY_MIN_LEN} and ${NOTE_BODY_MAX_LEN} characters.`,
        );
        setShowConfirm(false); // Go back to editing if invalid
        return;
      }
      if (r.code === "already_today") {
        toast.error("You already sent today’s note.");
        setElig({ ok: false, code: "already_today" });
        setShowConfirm(false);
        return;
      }
      toast.error("Couldn’t send your note. Try again.");
      setShowConfirm(false);
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-[160] bg-black/40 backdrop-blur-[2px]",
            "transition-opacity duration-200 ease-out",
            "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          )}
        />
        <Dialog.Viewport className="fixed inset-0 z-[160] flex items-end justify-center p-0 outline-none sm:items-center sm:p-4">
          <Dialog.Popup
            className={cn(
              "relative glass-card flex max-h-[min(95dvh,95svh)] w-full max-w-md flex-col gap-6 rounded-t-3xl border-b-0 border-t border-white/20 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] outline-none sm:rounded-3xl sm:border overflow-hidden",
              "data-[ending-style]:translate-y-6 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-6 data-[starting-style]:opacity-0",
              "transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)",
            )}
          >
            {/* Confirmation Overlay within the Popup */}
            {showConfirm && member && (
              <div className="absolute inset-0 z-[60] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-full flex flex-col items-center gap-4">
                  <h2 className="text-2xl font-bold font-heading tracking-tight text-foreground">Are you sure?</h2>
                  <p className="text-sm text-muted-foreground w-full break-words">Do you really want to send this message to <span className="font-semibold text-foreground">{member.display_name.split(" ")[0]}</span>?</p>
                  
                  <div className="w-full bg-muted/40 border border-border/60 p-5 rounded-[1.25rem] my-2 max-h-[30vh] overflow-y-auto text-left shadow-inner">
                    <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap italic opacity-90">
                      &quot;{body}&quot;
                    </p>
                  </div>

                  <div className="flex flex-row items-center gap-3 w-full mt-4">
                    <Button 
                      type="button"
                      variant="outline" 
                      className="flex-1 h-14 rounded-2xl text-[15px] font-semibold border-border/70 shadow-sm" 
                      onClick={() => setShowConfirm(false)} 
                      disabled={pending}
                    >
                      No
                    </Button>
                    <Button 
                      type="button"
                      className="flex-1 h-14 rounded-2xl text-[15px] font-semibold bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-[0_8px_20px_rgba(250,115,22,0.25)] hover:brightness-110" 
                      onClick={onSubmit} 
                      disabled={pending || !lengthOk}
                    >
                      {pending ? <Loader2 className="mx-auto size-5 animate-spin" aria-hidden /> : "Yes"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Dialog.Title className="sr-only">
              {member ? `${member.display_name}` : "Person"}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {isSelf ? "You cannot select yourself." : "Send a note or view status"}
            </Dialog.Description>
            {member ? (
              <>
                {!isSelf ? <DialogCampaignTeaser status={dailyCampaignStatus} /> : null}
                <div className="flex flex-col items-center gap-4 text-center mt-2">
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary/40 to-primary/10 blur-md" aria-hidden />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="relative size-24 rounded-full object-cover ring-4 ring-background shadow-[0_8px_20px_rgba(250,115,22,0.2)] sm:size-28"
                    />
                  </div>
                  <p className="font-heading text-2xl font-bold tracking-tight text-foreground/95 drop-shadow-sm">{member.display_name}</p>
                </div>
                {isSelf ? (
                  <>
                    <div
                      className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-5 text-center"
                      role="status"
                    >
                      <Lock className="size-7 text-muted-foreground" aria-hidden />
                      <p className="text-sm font-medium text-foreground">That&apos;s you</p>
                    </div>
                    <div className="flex flex-row items-center gap-3 mt-2">
                      <Dialog.Close
                        className="flex-1 h-14 rounded-2xl text-[15px] font-semibold border border-border/70 hover:bg-muted/50 transition-colors flex items-center justify-center"
                      >
                        Close
                      </Dialog.Close>
                    </div>
                  </>
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
                      <div className="space-y-4">
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
                            className="resize-y min-h-[100px] rounded-[1.25rem] border-border/80 bg-background/50 shadow-inner backdrop-blur focus-visible:ring-primary/40 text-[15px]"
                            aria-describedby="daily-note-counter"
                          />
                          <div
                            id="daily-note-counter"
                            className="space-y-0.5 px-1 text-right text-xs font-medium text-muted-foreground/80"
                          >
                            {trimmedLen < NOTE_BODY_MIN_LEN ? (
                              <p className="text-amber-700/90 dark:text-amber-400/90">
                                At least {NOTE_BODY_MIN_LEN} characters (
                                {NOTE_BODY_MIN_LEN - trimmedLen} more needed)
                              </p>
                            ) : null}
                            <p>
                              {body.length}/{NOTE_BODY_MAX_LEN}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-row items-center gap-3 w-full">
                          <Dialog.Close
                            className="h-14 w-1/3 rounded-2xl border border-border/70 hover:bg-muted/50 transition-colors text-[15px] font-semibold text-foreground/80 flex items-center justify-center bg-transparent"
                          >
                            Close
                          </Dialog.Close>
                          <Button
                            type="button"
                            className={cn(
                              "flex-1 h-14 rounded-2xl bg-gradient-to-b from-primary to-primary/80 text-[15px] sm:text-[16px] font-bold text-primary-foreground shadow-[0_8px_24px_rgba(250,115,22,0.25)] ring-1 ring-primary/50 transition-all duration-300",
                              "hover:shadow-[0_12px_32px_rgba(250,115,22,0.35)] hover:brightness-110 active:scale-[0.98]",
                            )}
                            disabled={pending || !lengthOk}
                            onClick={() => setShowConfirm(true)}
                          >
                            Send it 🚀
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-row items-center justify-center gap-3 mt-2">
                        <Dialog.Close
                          className="w-full h-14 rounded-2xl text-[15px] font-semibold border border-border/70 hover:bg-muted/50 transition-colors flex items-center justify-center bg-transparent"
                        >
                          Close
                        </Dialog.Close>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
