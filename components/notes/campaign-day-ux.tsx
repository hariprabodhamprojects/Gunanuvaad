"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
import { useCampaignCountdown, formatCountdown } from "@/hooks/use-campaign-countdown";
import { cn } from "@/lib/utils";

const DISMISS_STORAGE_KEY = "gunanuvad_home_campaign_notice_dismissed";

function noticeFingerprint(status: DailyCampaignStatus): string {
  return `${status.campaignTodayISO}|${status.sentToday ? "1" : "0"}`;
}

function useRefreshWhenCountdownEnds(nextResetAtIso: string) {
  const router = useRouter();
  const remMs = useCampaignCountdown(nextResetAtIso);
  const prev = useRef(remMs);

  useEffect(() => {
    if (prev.current > 0 && remMs <= 0) {
      router.refresh();
    }
    prev.current = remMs;
  }, [remMs, router]);

  return remMs;
}

/** Home: one-line dismissible notification above the greeting. */
export function CampaignDayNotification({ status }: { status: DailyCampaignStatus }) {
  const { sentToday, nextResetAt } = status;
  const remMs = useRefreshWhenCountdownEnds(nextResetAt);
  const countdown = formatCountdown(remMs);
  const fp = useMemo(
    () => noticeFingerprint(status),
    [status.campaignTodayISO, status.sentToday],
  );

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      setDismissed(window.localStorage.getItem(DISMISS_STORAGE_KEY) === fp);
    } catch {
      setDismissed(false);
    }
  }, [fp]);

  const onDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, fp);
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  const line = !sentToday
    ? [
        "Your note for today is waiting.",
        countdown ? `${countdown} left today.` : "",
      ]
        .filter(Boolean)
        .join(" ")
    : [
        "You're done for today 🔥",
        countdown ? `Come back after ${countdown}.` : "You can send your next note now.",
      ]
        .filter(Boolean)
        .join(" ");

  return (
    <div
      role="status"
      className={cn(
        "relative flex items-center gap-1 rounded-xl border py-1.5 pl-3 pr-1 shadow-sm",
        sentToday
          ? "border-primary/35 bg-primary/12 text-foreground"
          : "border-border/80 bg-muted/55 text-foreground",
      )}
    >
      <p className="min-w-0 flex-1 truncate text-sm font-medium leading-snug">{line}</p>
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          "shrink-0 rounded-lg p-2 text-foreground/80 transition-colors",
          "hover:bg-background/60 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        aria-label="Dismiss notification"
      >
        <X className="size-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

function DialogCampaignTeaserSent({ nextResetAt }: { nextResetAt: string }) {
  const remMs = useCampaignCountdown(nextResetAt);
  const countdown = formatCountdown(remMs);
  return (
    <div
      className="rounded-lg border border-border/80 bg-muted/50 px-3 py-2 text-center text-sm text-foreground"
      role="status"
    >
      <p>
        <span className="font-medium">Already sent today.</span>
        {countdown ? (
          <>
            {" "}
            Come back after <span className="tabular-nums font-semibold">{countdown}</span>.
          </>
        ) : (
          <> You can send again.</>
        )}
      </p>
    </div>
  );
}

/** Roster dialog: thin banner above the avatar. */
export function DialogCampaignTeaser({ status }: { status: DailyCampaignStatus }) {
  if (!status.sentToday) {
    return (
      <div
        className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-center text-sm text-foreground"
        role="status"
      >
        <p className="font-medium">Daily note still open — send below.</p>
      </div>
    );
  }
  return <DialogCampaignTeaserSent nextResetAt={status.nextResetAt} />;
}
