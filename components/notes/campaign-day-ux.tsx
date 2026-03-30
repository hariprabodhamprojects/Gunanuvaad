"use client";

import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  CAMPAIGN_TIMEZONE_SHORT_LABEL,
} from "@/lib/campaign-spec";
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

/** Home: full-width status, countdown, streak copy, subtle pulse. */
export function CampaignDayStatusCard({ status }: { status: DailyCampaignStatus }) {
  const { sentToday, nextResetAt, currentStreak } = status;
  const remMs = useRefreshWhenCountdownEnds(nextResetAt);
  const countdown = formatCountdown(remMs);
  const pulseRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = pulseRef.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        boxShadow: "0 0 0 2px hsl(var(--primary) / 0.22)",
        duration: 1.25,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, el);
    return () => ctx.revert();
  }, [sentToday]);

  return (
    <Card className="overflow-hidden ring-border/60">
      <CardContent className="p-4 sm:p-5">
        <div
          ref={pulseRef}
          className={cn(
            "rounded-xl border border-border/50 bg-muted/20 px-4 py-3.5 sm:px-5 sm:py-4",
            "shadow-sm transition-shadow",
          )}
        >
          {!sentToday ? (
            <>
              <p className="font-heading text-lg font-semibold leading-snug text-foreground sm:text-xl">
                Your note for today is waiting
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Choose someone below and send one appreciation before the day resets.
              </p>
              <p className="mt-3 text-sm font-medium text-foreground">
                {currentStreak >= 1
                  ? `You're on a ${currentStreak}-day streak — send today to keep it alive.`
                  : "Sending on each campaign day builds your streak on Standings."}
              </p>
              {countdown ? (
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  Time left today: <span className="font-medium text-foreground">{countdown}</span>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-heading text-lg font-semibold leading-snug text-foreground sm:text-xl">
                You&apos;re done for today <span aria-hidden>🔥</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {countdown ? (
                  <>
                    Next campaign day in <span className="tabular-nums text-foreground">{countdown}</span>.
                  </>
                ) : (
                  <>The new campaign day just started — you can send your next note.</>
                )}
              </p>
              <p className="mt-3 text-sm font-medium text-foreground">
                {currentStreak >= 1
                  ? `Come back tomorrow to extend your ${currentStreak}-day streak.`
                  : "Tomorrow you can send again and start a streak."}
              </p>
            </>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Resets at midnight ({CAMPAIGN_TIMEZONE_SHORT_LABEL}).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Roster dialog: compact teaser above the avatar. */
export function DialogCampaignTeaser({ status }: { status: DailyCampaignStatus }) {
  const { sentToday, nextResetAt, currentStreak } = status;
  const remMs = useCampaignCountdown(nextResetAt);
  const countdown = formatCountdown(remMs);

  if (!sentToday) {
    return (
      <div
        className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-center text-sm"
        role="status"
      >
        <p className="font-medium text-foreground">Daily note still open</p>
        <p className="mt-1 text-muted-foreground">
          {currentStreak >= 1
            ? `Streak: ${currentStreak} day${currentStreak === 1 ? "" : "s"} — send today to protect it.`
            : "Send your one note today to start a streak."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 text-center text-sm"
      role="status"
    >
      <p className="font-medium text-foreground">Already sent today</p>
      <p className="mt-1 tabular-nums text-muted-foreground">
        {countdown ? (
          <>
            Next note in <span className="text-foreground">{countdown}</span>
          </>
        ) : (
          "New day — you can send again."
        )}
      </p>
      {currentStreak >= 1 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Extend your {currentStreak}-day streak tomorrow.
        </p>
      ) : null}
    </div>
  );
}
