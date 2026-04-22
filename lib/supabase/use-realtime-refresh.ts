"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
   * Default 150 ms — responsive without hammering the server on bursts.
   *
   * Scheduling is leading-edge + trailing-edge coalescing: the first event
   * in a quiet period schedules a refresh at T+debounceMs, and any events
   * that arrive inside that window are guaranteed to trigger exactly one
   * additional refresh on the trailing edge — so we never miss the "final"
   * state of a burst even if the last write lands microseconds before the
   * leading-edge timer fires (which, historically, was the cause of the
   * flaky "standings didn't update after revoke" bug).
   */
  debounceMs?: number;
  /** Set to `false` to pause the subscription. Defaults to `true`. */
  enabled?: boolean;
  /**
   * Optional periodic refresh fallback (ms). Useful when websocket delivery
   * is flaky in specific environments — keeps server-rendered pages fresh
   * without requiring manual reloads.
   */
  fallbackIntervalMs?: number;
};

/**
 * Subscribe to Supabase Realtime `postgres_changes` for one or more tables
 * and call `router.refresh()` whenever a subscribed event fires.
 *
 * Intended for pages whose data is rendered by a React Server Component —
 * a refresh re-runs the server fetch and streams an updated tree down.
 *
 * Requirements:
 * 1. Each `table` must be in the `supabase_realtime` publication
 *    (see `supabase/migrations/*_realtime*.sql`).
 * 2. RLS must let the current user `SELECT` the affected row, otherwise
 *    Supabase filters the event out before delivery.
 * 3. For `UPDATE` events on tables with RLS: the table must be set to
 *    `REPLICA IDENTITY FULL`. Postgres's default replica identity only
 *    logs the primary key of the *old* row, which isn't enough for
 *    Supabase Realtime to evaluate the SELECT policy against the
 *    pre-image. Without FULL, UPDATE events are silently dropped and
 *    subscribers never refresh. See
 *    `supabase/migrations/20260420130000_swadhyay_redesign_realtime.sql`
 *    for the pattern.
 */
export function useRealtimeRefresh({
  channel,
  subscriptions,
  debounceMs = 150,
  enabled = true,
  fallbackIntervalMs,
}: Options) {
  const router = useRouter();
  // Re-subscribe only when the logical shape of the subscription list changes.
  // Serializing keeps the effect dependency stable even if the parent rebuilds
  // the array on every render.
  const key = subscriptions
    .map((s) => `${s.table}|${s.event ?? "*"}|${s.filter ?? ""}`)
    .join("||");

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) return;

    const DEBUG = false;
    const log = (...args: unknown[]) => {
      if (DEBUG) console.debug(`[realtime:${channel}]`, ...args);
    };

    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    // Leading-edge + trailing-edge coalescing debounce.
    //   - First event in a quiet period → schedule refresh at T+debounceMs.
    //   - Events arriving while the timer is running → set `trailingPending`.
    //   - When timer fires: refresh. If trailing was pending, start another
    //     window so we always capture the "final" state of a burst.
    // This replaces an earlier leading-edge-only throttle that dropped every
    // event after the first, occasionally missing the trailing event if it
    // landed just before the timer fired (see P0 bug "standings didn't
    // update after revoke").
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

    // Supabase's typed `.on("postgres_changes", ...)` signature uses a
    // complex overload that doesn't compose well when the filter is built
    // dynamically; casting to a loose shape is safe here because the server
    // is the source of truth for event validation.
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
    // `key` captures every meaningful change in the subscription list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, key, debounceMs, enabled, fallbackIntervalMs, router]);
}
