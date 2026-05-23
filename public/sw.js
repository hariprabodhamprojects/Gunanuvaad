// MananChintan service worker — reminder push only.
// Intentionally tiny: no offline cache, no asset interception. The PwaShellRefresh
// component already handles "new deploy, refresh the shell" cleanly.
//
// /logo.png is the same icon used in the landing splash, so reminders feel like
// the app, not a generic web notification.

const ICON_URL = "/logo.png";
const DEFAULT_URL = "/home";

self.addEventListener("install", (event) => {
  // Activate the new worker as soon as it's installed so users always get the
  // latest push handler without needing to close every tab first.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "મનન ચિંતન", body: event.data.text() };
    }
  }

  const title = payload.title || "મનન ચિંતન";
  const options = {
    body: payload.body || "A gentle reminder from MananChintan.",
    icon: payload.icon || ICON_URL,
    badge: payload.badge || ICON_URL,
    tag: payload.tag || "mc-reminder",
    // Replace any prior reminder with the same tag so a user opening the app
    // 3 hours later doesn't see a stack of 5 stale nudges.
    renotify: false,
    requireInteraction: false,
    data: {
      url: payload.url || DEFAULT_URL,
      tag: payload.tag || "mc-reminder",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || DEFAULT_URL;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Prefer focusing an already-open tab on the same origin and navigating it.
      for (const client of allClients) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            await client.focus();
            if ("navigate" in client) {
              try {
                await client.navigate(targetUrl);
              } catch {
                // Some browsers reject navigate() across cross-document boundaries;
                // focusing the existing tab is the next best thing.
              }
            }
            return;
          }
        } catch {
          // Ignore malformed client URLs.
        }
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});

// Browsers occasionally rotate push endpoints (e.g. Chrome after key refresh).
// We can't re-subscribe from the SW alone (needs the public VAPID key, which
// lives in the page), so we just nudge any open client to do it on next load.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        client.postMessage({ type: "mc-resubscribe" });
      }
    })(),
  );
});
