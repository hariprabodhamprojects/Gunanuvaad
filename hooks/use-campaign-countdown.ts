"use client";

import { useEffect, useState } from "react";

export function useCampaignCountdown(nextResetAtIso: string): number {
  const [remMs, setRemMs] = useState(() =>
    Math.max(0, new Date(nextResetAtIso).getTime() - Date.now()),
  );

  useEffect(() => {
    const tick = () =>
      setRemMs(Math.max(0, new Date(nextResetAtIso).getTime() - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextResetAtIso]);

  return remMs;
}

/** `null` when time is up (client should refresh or wait for next SSR). */
export function formatCountdown(remMs: number): string | null {
  if (remMs <= 0) return null;
  const s = Math.floor(remMs / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${String(sec).padStart(2, "0")}s`);
  return parts.join(" ");
}
