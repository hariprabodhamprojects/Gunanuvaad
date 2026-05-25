import { NextResponse } from "next/server";
import { configureWebPushVapid } from "@/lib/notifications/push-send";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { createClient } from "@/lib/supabase/server";

/**
 * Quick self-check while debugging push on a device.
 * Open while signed in: /api/push/status
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const vapid = configureWebPushVapid();
  const isOrganizer = await getIsOrganizerSession();

  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, created_at, last_seen_at")
    .order("last_seen_at", { ascending: false });

  const tableMissing =
    subsErr?.message?.includes("push_subscriptions") &&
    (subsErr.message.includes("does not exist") || subsErr.code === "42P01");

  return NextResponse.json({
    ok: true,
    email: user.email,
    userId: user.id,
    isOrganizer,
    vapidConfigured: vapid.ok,
    vapidError: vapid.ok ? null : vapid.error,
    subscriptionCount: subs?.length ?? 0,
    subscriptions: (subs ?? []).map((s) => ({
      id: s.id,
      endpointPreview: `${String(s.endpoint).slice(0, 48)}…`,
      lastSeenAt: s.last_seen_at,
    })),
    database: subsErr
      ? {
          ok: false,
          code: subsErr.code,
          message: subsErr.message,
          hint: tableMissing
            ? "Run supabase/migrations/20260523120000_push_subscriptions.sql in the Supabase SQL editor."
            : undefined,
        }
      : { ok: true },
    nextSteps:
      subsErr && tableMissing
        ? ["Run the push_subscriptions migration in Supabase."]
        : !vapid.ok
          ? ["Add VAPID_* env vars on Vercel and redeploy."]
          : (subs?.length ?? 0) === 0
            ? [
                "On your phone: Profile → Daily reminders ON (accept the OS prompt).",
                "iPhone: open the app from the Home Screen icon (not Safari tabs).",
              ]
            : isOrganizer
              ? ["Profile → tap Send test notification (organizer only; your devices)."]
              : ["Scheduled reminders will arrive at the daily cron times when enabled."],
  });
}
