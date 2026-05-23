import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  buildReminderPayload,
  configureWebPushVapid,
  fanOutPush,
  type PushSubscriptionRow,
} from "@/lib/notifications/push-send";
import { pickReminderSlot } from "@/lib/notifications/reminder-copy";

/**
 * Vercel Cron hits this every 15 minutes (see `vercel.json`).
 *
 * Sends to **all** subscribed devices. To test on your phone only, use
 * `POST /api/push/test` while signed in (see that route's comment).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<Response> {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const slot = pickReminderSlot();
  if (!slot) {
    return NextResponse.json({ ok: true, skipped: true, reason: "outside-slot-window" });
  }

  const vapid = configureWebPushVapid();
  if (!vapid.ok) {
    return NextResponse.json({ ok: false, error: vapid.error }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase service-role env not configured" },
      { status: 500 },
    );
  }

  const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (error) {
    console.error("[cron/reminders] failed to load subscriptions", error.message);
    return NextResponse.json({ ok: false, error: "subscription-load-failed" }, { status: 500 });
  }

  const rows = (subs ?? []) as PushSubscriptionRow[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, slot: slot.id, sent: 0, removed: 0, total: 0 });
  }

  const payload = JSON.stringify(buildReminderPayload(slot));
  const { sent, failed, expiredIds } = await fanOutPush(rows, payload);

  let removed = 0;
  if (expiredIds.length > 0) {
    const { error: delErr, count } = await admin
      .from("push_subscriptions")
      .delete({ count: "exact" })
      .in("id", expiredIds);
    if (delErr) {
      console.error("[cron/reminders] cleanup failed", delErr.message);
    } else {
      removed = count ?? expiredIds.length;
    }
  }

  return NextResponse.json({
    ok: true,
    slot: slot.id,
    total: rows.length,
    sent,
    failed,
    removed,
  });
}
