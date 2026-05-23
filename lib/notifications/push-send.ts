import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import type { ReminderSlot } from "@/lib/notifications/reminder-copy";

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export function buildReminderPayload(slot: ReminderSlot) {
  return {
    title: slot.title,
    body: slot.body,
    url: slot.url,
    tag: `mc-${slot.id}`,
    icon: "/logo.png",
    badge: "/logo.png",
  };
}

export function configureWebPushVapid(): { ok: true } | { ok: false; error: string } {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidContact = process.env.VAPID_CONTACT_EMAIL?.trim();
  if (!vapidPublicKey || !vapidPrivateKey || !vapidContact) {
    return {
      ok: false,
      error: "VAPID env vars missing (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_CONTACT_EMAIL)",
    };
  }
  webpush.setVapidDetails(
    vapidContact.startsWith("mailto:") ? vapidContact : `mailto:${vapidContact}`,
    vapidPublicKey,
    vapidPrivateKey,
  );
  return { ok: true };
}

export type FanOutResult = {
  sent: number;
  failed: number;
  expiredIds: string[];
};

/** Send the same JSON payload to many browser endpoints; collect dead ones for cleanup. */
export async function fanOutPush(
  rows: PushSubscriptionRow[],
  payloadJson: string,
): Promise<FanOutResult> {
  const results = await Promise.allSettled(
    rows.map((row) => sendToSubscription(row, payloadJson)),
  );

  const expiredIds: string[] = [];
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < results.length; i += 1) {
    const r = results[i]!;
    const row = rows[i]!;
    if (r.status === "fulfilled") {
      sent += 1;
      continue;
    }
    const err = r.reason as { statusCode?: number; message?: string };
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      expiredIds.push(row.id);
    } else {
      failed += 1;
      console.warn(
        `[push] send failed endpoint=${row.endpoint.slice(0, 64)} status=${err?.statusCode ?? "?"} msg=${err?.message ?? "?"}`,
      );
    }
  }
  return { sent, failed, expiredIds };
}

function sendToSubscription(row: PushSubscriptionRow, payload: string) {
  const subscription: WebPushSubscription = {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
  return webpush.sendNotification(subscription, payload, {
    TTL: 60 * 60 * 4,
    urgency: "normal",
  });
}
