import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MananChintan",
    short_name: "MananChintan",
    description: "Daily appreciation with your crew — points, streaks, private notes.",
    // Open the PWA directly into the app. When the cookie is still valid the
    // user lands on /home; when it isn't, the middleware/auth guard sends them
    // to "/" for sign-in. This stops the PWA from showing the Google CTA on
    // every cold open while the session is actually still good.
    start_url: "/home",
    // Scope covers the entire app surface so the OAuth callback URL still
    // opens inside the standalone PWA (instead of bouncing to Safari).
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
