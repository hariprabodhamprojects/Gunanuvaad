import { type NextRequest, NextResponse } from "next/server";
import {
  buildReminderPayload,
  configureWebPushVapid,
  fanOutPush,
  type PushSubscriptionRow,
} from "@/lib/notifications/push-send";
import { getReminderSlotById, REMINDER_SLOTS } from "@/lib/notifications/reminder-copy";
import { createClient } from "@/lib/supabase/server";

/**
 * Organizer-only: send one reminder-style push to **this signed-in user's**
 * devices only (never other members). Scheduled reminders use /api/cron/reminders.
 *
 *   POST /api/push/test
 *   Body (optional): { "slotId": "morning-note" }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: isOrganizer, error: orgErr } = await supabase.rpc("is_organizer_session");
  if (orgErr) {
    console.error("[push/test] is_organizer_session", orgErr.message);
    return NextResponse.json({ ok: false, error: "organizer-check-failed" }, { status: 500 });
  }
  if (!isOrganizer) {
    return NextResponse.json(
      { ok: false, error: "forbidden", message: "Test notifications are organizer-only." },
      { status: 403 },
    );
  }

  let slotId = REMINDER_SLOTS[0]!.id;
  try {
    const body = (await request.json()) as { slotId?: string };
    if (typeof body?.slotId === "string" && body.slotId.trim()) {
      slotId = body.slotId.trim();
    }
  } catch {
    // empty body is fine — default slot
  }

  const slot = getReminderSlotById(slotId) ?? REMINDER_SLOTS[0]!;

  const vapid = configureWebPushVapid();
  if (!vapid.ok) {
    return NextResponse.json({ ok: false, error: vapid.error }, { status: 500 });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (error) {
    console.error("[push/test] load subscriptions", error.message);
    return NextResponse.json({ ok: false, error: "subscription-load-failed" }, { status: 500 });
  }

  const rows = (subs ?? []) as PushSubscriptionRow[];
  if (rows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "no-subscription",
        message: "No push subscription for this account. Turn on Daily reminders first.",
      },
      { status: 400 },
    );
  }

  const payload = JSON.stringify(buildReminderPayload(slot));
  const { sent, failed, expiredIds } = await fanOutPush(rows, payload);

  if (expiredIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .in("id", expiredIds);
  }

  if (sent === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "send-failed",
        message: "Push service rejected the notification. Try toggling reminders off and on.",
        failed,
        removed: expiredIds.length,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    slot: slot.id,
    userId: user.id,
    devices: rows.length,
    sent,
    failed,
    removed: expiredIds.length,
  });
}
