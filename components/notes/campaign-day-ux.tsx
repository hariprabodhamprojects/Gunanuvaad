"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
import { useCampaignCountdown, formatCountdown } from "@/hooks/use-campaign-countdown";
import { cn } from "@/lib/utils";

/** Per-user: same browser must not share dismiss state across accounts. */
function dismissStorageKey(userId: string): string {
  return `gunanuvad_home_campaign_notice_dismissed:${userId}`;
}

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
export function CampaignDayNotification({
  userId,
  status,
}: {
  userId: string;
  status: DailyCampaignStatus;
}) {
  const { sentToday, nextResetAt } = status;
  const remMs = useRefreshWhenCountdownEnds(nextResetAt);
  const countdown = formatCountdown(remMs);
  const fp = useMemo(
    () => noticeFingerprint(status),
    [status.campaignTodayISO, status.sentToday],
  );

  const [dismissed, setDismissed] = useState(false);
  const storageKey = dismissStorageKey(userId);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      setDismissed(window.localStorage.getItem(storageKey) === fp);
    } catch {
      setDismissed(false);
    }
  }, [fp, storageKey]);

  const onDismiss = () => {
    try {
      window.localStorage.setItem(storageKey, fp);
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
        "relative flex items-center gap-2 rounded-2xl py-2 pl-4 pr-1.5 shadow-md backdrop-blur-md transition-all duration-300 ring-1",
        sentToday
          ? "ring-primary/30 bg-gradient-to-r from-primary/20 to-primary/5 text-foreground shadow-[0_4px_16px_rgba(250,115,22,0.1)]"
          : "ring-border/50 bg-gradient-to-r from-muted/50 to-muted/20 text-foreground",
      )}
    >
      <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug tracking-wide">{line}</p>
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          "shrink-0 rounded-xl p-2.5 text-foreground/70 transition-colors",
          "hover:bg-background/80 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
      className="rounded-xl border border-border/60 bg-gradient-to-b from-muted/40 to-muted/10 px-4 py-2.5 text-center text-sm text-foreground shadow-sm backdrop-blur-sm"
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
        className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent px-4 py-2.5 text-center text-sm text-foreground shadow-[0_2px_10px_rgba(250,115,22,0.08)] backdrop-blur-sm"
        role="status"
      >
        <p className="font-semibold text-primary/90">Daily note still open — send below.</p>
      </div>
    );
  }
  return <DialogCampaignTeaserSent nextResetAt={status.nextResetAt} />;
}
