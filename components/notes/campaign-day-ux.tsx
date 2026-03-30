"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { DailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
import { useCampaignCountdown, formatCountdown } from "@/hooks/use-campaign-countdown";
import { cn } from "@/lib/utils";

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

/** Home: compact alert strip (not a card). */
export function CampaignDayStatusCard({ status }: { status: DailyCampaignStatus }) {
  const { sentToday, nextResetAt } = status;
  const remMs = useRefreshWhenCountdownEnds(nextResetAt);
  const countdown = formatCountdown(remMs);

  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm leading-snug sm:px-4 sm:text-[0.9375rem]",
        sentToday
          ? "border-primary/40 bg-primary/12 text-foreground"
          : "border-border/80 bg-muted/50 text-foreground",
      )}
    >
      {!sentToday ? (
        <p>
          <span className="font-semibold">Your note for today is waiting.</span>
          {countdown ? (
            <>
              {" "}
              <span className="tabular-nums font-medium">{countdown}</span> left today.
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-foreground">
          <span className="font-semibold">You&apos;re done for today</span> <span aria-hidden>🔥</span>
          {countdown ? (
            <>
              {" "}
              Come back after <span className="tabular-nums font-semibold">{countdown}</span>.
            </>
          ) : (
            <> You can send your next note now.</>
          )}
        </p>
      )}
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
