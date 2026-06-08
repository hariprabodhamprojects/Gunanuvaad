"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REALTIME } from "@/lib/supabase/realtime-tuning";

type PgEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export type RealtimeSubscription = {
  /** Table name in the `public` schema, e.g. "daily_notes". */
  table: string;
  /** Postgres event to listen for; defaults to "*". */
  event?: PgEvent;
  /**
   * Optional server-side filter, e.g. `topic_id=eq.<uuid>`.
   * See Supabase Realtime docs for supported operators.
   */
  filter?: string;
};

type Options = {
  /**
   * Unique channel name — two components using the same name will share
   * one WebSocket subscription. Include a stable identifier like a topic id.
   */
  channel: string;
  subscriptions: RealtimeSubscription[];
  /**
   * Milliseconds to wait before calling router.refresh() after an event.
   * Default from {@link REALTIME.defaultDebounceMs}.
   */
  debounceMs?: number;
  /** Set to `false` to pause the subscription. Defaults to `true`. */
  enabled?: boolean;
  /**
   * Optional periodic refresh fallback (ms). Useful when websocket delivery
   * is flaky in specific environments — keeps server-rendered pages fresh
   * without requiring manual reloads. Skipped while the tab is hidden.
   */
  fallbackIntervalMs?: number;
  /**
   * Tear down Realtime and skip refreshes while the document is hidden
   * (background tab / phone app switched away). Defaults to `true`.
   */
  pauseWhenHidden?: boolean;
};

function usePageVisible(pauseWhenHidden: boolean): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!pauseWhenHidden || typeof document === "undefined") return;
    const sync = () => setVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [pauseWhenHidden]);

  return pauseWhenHidden ? visible : true;
}

/**
 * Subscribe to Supabase Realtime `postgres_changes` for one or more tables
 * and call `router.refresh()` whenever a subscribed event fires.
 *
 * Intended for pages whose data is rendered by a React Server Component —
 * a refresh re-runs the server fetch and streams an updated tree down.
 */
export function useRealtimeRefresh({
  channel,
  subscriptions,
  debounceMs = REALTIME.defaultDebounceMs,
  enabled = true,
  fallbackIntervalMs,
  pauseWhenHidden = true,
}: Options) {
  const router = useRouter();
  const pageVisible = usePageVisible(pauseWhenHidden);
  const active = enabled && pageVisible;

  const key = subscriptions
    .map((s) => `${s.table}|${s.event ?? "*"}|${s.filter ?? ""}`)
    .join("||");

  useEffect(() => {
    if (!active || subscriptions.length === 0) return;

    const DEBUG = false;
    const log = (...args: unknown[]) => {
      if (DEBUG) console.debug(`[realtime:${channel}]`, ...args);
    };

    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let trailingPending = false;

    const fireRefresh = () => {
      log("calling router.refresh()");
      router.refresh();
    };
    const runTimer = () => {
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        fireRefresh();
        if (trailingPending) {
          trailingPending = false;
          log("trailing event pending → scheduling coalesced refresh");
          runTimer();
        }
      }, debounceMs);
    };
    const scheduleRefresh = (payload?: unknown) => {
      log("event received → scheduling refresh", payload);
      if (refreshTimer) {
        trailingPending = true;
        return;
      }
      runTimer();
    };

    const ch = supabase.channel(channel);
    const onAny = ch.on.bind(ch) as (
      type: "postgres_changes",
      filter: {
        event: PgEvent;
        schema: string;
        table: string;
        filter?: string;
      },
      callback: (payload: unknown) => void,
    ) => typeof ch;

    for (const sub of subscriptions) {
      log("registering subscription", sub);
      onAny(
        "postgres_changes",
        {
          event: sub.event ?? "*",
          schema: "public",
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        scheduleRefresh,
      );
    }
    ch.subscribe((status, err) => {
      log("channel status →", status, err ?? "");
    });

    if (fallbackIntervalMs && fallbackIntervalMs > 0) {
      log(`fallback polling enabled: ${fallbackIntervalMs}ms`);
      fallbackTimer = setInterval(() => {
        log("fallback tick → scheduling refresh");
        scheduleRefresh();
      }, fallbackIntervalMs);
    }

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      if (fallbackTimer) clearInterval(fallbackTimer);
      supabase.removeChannel(ch);
      log("channel torn down");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, key, debounceMs, active, fallbackIntervalMs, router]);

  /** One catch-up refresh when the user returns to the tab (not on first mount). */
  const wasHiddenRef = useRef(false);
  useEffect(() => {
    if (!pauseWhenHidden || !enabled) return;
    if (!pageVisible) {
      wasHiddenRef.current = true;
      return;
    }
    if (!wasHiddenRef.current) return;
    wasHiddenRef.current = false;
    router.refresh();
  }, [pageVisible, pauseWhenHidden, enabled, router]);
}
