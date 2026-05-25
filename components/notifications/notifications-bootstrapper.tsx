"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ensureServiceWorker,
  getPermissionState,
  getPushSupportState,
  reconcileSubscriptionSilently,
  subscribeToPush,
} from "@/lib/notifications/web-push-client";

const PROMPT_DELAY_MS = 3_000;
const PROMPT_TOAST_ID = "mc-push-prompt";

/**
 * Mounted once inside the authenticated shell. Responsible for:
 *   1. Registering `/sw.js` so push payloads have something to handle them.
 *   2. Listening for the SW's `mc-resubscribe` message (browser-rotated endpoint).
 *   3. Silently re-persisting an existing subscription if our DB lost it
 *      (e.g. user signed in on a new device).
 *   4. Prompting on **every app open** while browser permission is still
 *      `default`. Once the user grants (or denies) permission, the prompt
 *      stops appearing. Browser security forbids auto-requesting permission,
 *      so we surface a button inside a sticky toast they have to tap.
 */
export function NotificationsBootstrapper() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const support = getPushSupportState();
    if (support.kind === "unsupported") return;
    if (support.kind === "ios-needs-install") return;

    let cancelled = false;
    let promptTimer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      await ensureServiceWorker();
      if (cancelled) return;

      const onMessage = (event: MessageEvent) => {
        const data = event.data as { type?: string } | null;
        if (data?.type === "mc-resubscribe") {
          void reconcileSubscriptionSilently();
        }
      };
      navigator.serviceWorker.addEventListener("message", onMessage);

      const permission = getPermissionState();
      if (permission === "granted") {
        await reconcileSubscriptionSilently();
        return;
      }

      if (permission !== "default") return;
      if (typeof window === "undefined") return;

      promptTimer = setTimeout(() => {
        if (cancelled) return;
        toast("Turn on daily reminders", {
          id: PROMPT_TOAST_ID,
          description:
            "Gentle nudges to write a note, share on the feed, or post a Swadhyay. You can change this any time from your profile.",
          duration: Infinity,
          dismissible: true,
          action: {
            label: "Turn on",
            onClick: async () => {
              const result = await subscribeToPush();
              if (result.ok) {
                toast.dismiss(PROMPT_TOAST_ID);
                toast.success("Reminders are on. જય સ્વામિનારાયણ ✨");
              } else if (result.reason === "permission-denied") {
                toast.dismiss(PROMPT_TOAST_ID);
                toast.error(result.message ?? "Reminders are blocked in your browser.");
              } else {
                toast.error(result.message ?? "Couldn't enable reminders.");
              }
            },
          },
        });
      }, PROMPT_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (promptTimer) clearTimeout(promptTimer);
      if ("serviceWorker" in navigator) {
        // We don't store the listener reference in this branch; the next mount
        // would re-add a fresh listener which is harmless given the ranRef guard.
      }
    };
  }, []);

  return null;
}
