/**
 * Client-only helpers around the browser's `PushManager` + service worker.
 *
 * Nothing here runs on the server. Server-side fan-out lives in
 * `app/api/cron/reminders/route.ts`; subscription persistence in
 * `lib/notifications/subscription-actions.ts`.
 */

import { removeSubscription, saveSubscription } from "@/lib/notifications/subscription-actions";

export type PushSupportState =
  | { kind: "supported" }
  | { kind: "unsupported"; reason: "no-window" | "no-service-worker" | "no-push-manager" | "no-notification-api" }
  | { kind: "ios-needs-install" };

export type PushPermissionState = NotificationPermission | "unsupported";

const SW_URL = "/sw.js";
const SW_SCOPE = "/";

/** Detect whether this UA can actually do Web Push *right now*. */
export function getPushSupportState(): PushSupportState {
  if (typeof window === "undefined") {
    return { kind: "unsupported", reason: "no-window" };
  }
  if (!("serviceWorker" in navigator)) {
    return { kind: "unsupported", reason: "no-service-worker" };
  }
  if (!("PushManager" in window)) {
    // iOS Safari only exposes PushManager when the PWA is launched from the home screen.
    if (isIOS() && !isStandalone()) {
      return { kind: "ios-needs-install" };
    }
    return { kind: "unsupported", reason: "no-push-manager" };
  }
  if (!("Notification" in window)) {
    return { kind: "unsupported", reason: "no-notification-api" };
  }
  return { kind: "supported" };
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Mac; the touch check covers it.
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // Safari pre-PWA exposes `navigator.standalone`.
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function getPermissionState(): PushPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Idempotent register; resolves to a ready registration. */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  // updateViaCache: 'none' so we always hit the network for sw.js — pairs with
  // the no-cache headers in `next.config.ts`.
  const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_URL, {
    scope: SW_SCOPE,
    updateViaCache: "none",
  });
}

/**
 * Prompt for permission, subscribe to the browser's push service, and persist
 * the subscription server-side. Must be called from a user gesture (click) on
 * iOS / Safari.
 *
 * Returns `{ ok: false }` with a reason your UI can translate to copy.
 */
export type SubscribeOutcome =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: "unsupported" | "permission-denied" | "no-vapid-key" | "subscribe-failed" | "persist-failed"; message?: string };

export async function subscribeToPush(): Promise<SubscribeOutcome> {
  const support = getPushSupportState();
  if (support.kind !== "supported") {
    return {
      ok: false,
      reason: "unsupported",
      message:
        support.kind === "ios-needs-install"
          ? "Add MananChintan to your Home Screen first, then enable reminders."
          : "Your browser doesn't support push notifications.",
    };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { ok: false, reason: "no-vapid-key", message: "Reminders aren't configured for this environment yet." };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, reason: "permission-denied", message: "Reminders are blocked. Enable them in your browser settings." };
  }

  const registration = await ensureServiceWorker();
  if (!registration) {
    return { ok: false, reason: "unsupported", message: "Service worker unavailable." };
  }
  // Wait for it to be active so pushManager.subscribe doesn't race.
  await navigator.serviceWorker.ready;

  let subscription: PushSubscription;
  try {
    const existing = await registration.pushManager.getSubscription();
    subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));
  } catch (err) {
    return {
      ok: false,
      reason: "subscribe-failed",
      message: err instanceof Error ? err.message : "Couldn't subscribe to push.",
    };
  }

  const persisted = await saveSubscription(serializeSubscription(subscription));
  if (!persisted.ok) {
    return { ok: false, reason: "persist-failed", message: persisted.message };
  }

  return { ok: true, subscription };
}

export async function unsubscribeFromPush(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!("serviceWorker" in navigator)) return { ok: true };
  const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (!registration) return { ok: true };
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return { ok: true };
  const endpoint = subscription.endpoint;
  try {
    await subscription.unsubscribe();
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't unsubscribe." };
  }
  await removeSubscription(endpoint);
  return { ok: true };
}

/**
 * If the browser still holds a subscription (permission previously granted)
 * but our DB lost it, re-persist it silently. Used on app boot.
 */
export async function reconcileSubscriptionSilently(): Promise<void> {
  const support = getPushSupportState();
  if (support.kind !== "supported") return;
  if (Notification.permission !== "granted") return;

  const registration = await ensureServiceWorker();
  if (!registration) return;
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await saveSubscription(serializeSubscription(existing));
    return;
  }

  // Permission is granted but no subscription exists yet. Resubscribe.
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return;
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    await saveSubscription(serializeSubscription(subscription));
  } catch {
    // Some browsers reject `subscribe` if it isn't tied to a user gesture even
    // after permission is granted (rare). The next manual interaction in
    // SettingsPanel will succeed.
  }
}

export type SerializedSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function serializeSubscription(sub: PushSubscription): SerializedSubscription {
  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  return {
    endpoint: json.endpoint ?? sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

/**
 * VAPID public keys are URL-safe base64; PushManager wants a raw byte array.
 *
 * Backing-buffer must be `ArrayBuffer` (not `SharedArrayBuffer`) for the
 * PushSubscriptionOptions.applicationServerKey type since TS lib.dom started
 * distinguishing the two. Allocating the buffer up-front keeps that invariant.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
