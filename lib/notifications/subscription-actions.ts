"use server";

import { createClient } from "@/lib/supabase/server";
import type { SerializedSubscription } from "@/lib/notifications/web-push-client";

export type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Persist a browser push subscription for the current user. Idempotent on
 * `endpoint` so re-subscribing the same device just bumps `last_seen_at`.
 */
export async function saveSubscription(sub: SerializedSubscription): Promise<ActionResult> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, message: "Subscription is missing endpoint or keys." };
  }

  const supabase = await createClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return { ok: false, message: "Not signed in." };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: auth.user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent:
          typeof globalThis !== "undefined" && "navigator" in globalThis
            ? (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent?.slice(0, 500) ?? null
            : null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    console.error("[push] saveSubscription", error.message, error.code);
    const tableMissing =
      error.message.includes("push_subscriptions") &&
      (error.message.includes("does not exist") || error.code === "42P01");
    if (tableMissing) {
      return {
        ok: false,
        message:
          "Push database table is missing. Run the push_subscriptions migration in Supabase, then try again.",
      };
    }
    return { ok: false, message: `Couldn't save subscription (${error.code ?? "error"}).` };
  }
  return { ok: true };
}

/** Delete a single endpoint when the user toggles off or revokes permission. */
export async function removeSubscription(endpoint: string): Promise<ActionResult> {
  if (!endpoint) return { ok: false, message: "Missing endpoint." };

  const supabase = await createClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return { ok: false, message: "Not signed in." };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("[push] removeSubscription", error.message);
    return { ok: false, message: "Couldn't remove subscription." };
  }
  return { ok: true };
}
