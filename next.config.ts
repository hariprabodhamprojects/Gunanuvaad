import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  env: {
    /** Changes each deploy — PWA clients use this to refresh stale HTML/RSC. */
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.VERCEL_DEPLOYMENT_ID ??
      "dev",
  },
  // Pin workspace root when a parent folder (e.g. Desktop) has another lockfile.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  /** Smruti posts send several images via Server Actions; default ~1MB is too low (413 on Vercel). */
  experimental: {
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
  /** Service worker must never be cached — otherwise users get stuck on an old push handler. */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
