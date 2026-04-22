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
   * Milliseconds to wait before calling router.refresh() after the latest
   * event; events that arrive inside this window collapse into one refresh.
   * Default 150 ms — responsive without hammering the server on bursts.
   */
  debounceMs?: number;
  /** Set to `false` to pause the subscription. Defaults to `true`. */
  enabled?: boolean;
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

    // Temporary diagnostic logging. Flip this flag off once realtime
    // subscriptions are confirmed stable across the app — it's noisy but
    // invaluable when events silently disappear (see the Apr 2026 standings
    // realtime incident: publication gap + REPLICA IDENTITY default both
    // dropped UPDATE events without surfacing any error).
    const DEBUG = true;
    const log = (...args: unknown[]) => {
      if (DEBUG) console.debug(`[realtime:${channel}]`, ...args);
    };

    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = (payload?: unknown) => {
      log("event received → scheduling refresh", payload);
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        log("calling router.refresh()");
        router.refresh();
      }, debounceMs);
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

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(ch);
      log("channel torn down");
    };
    // `key` captures every meaningful change in the subscription list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, key, debounceMs, enabled, router]);
}
