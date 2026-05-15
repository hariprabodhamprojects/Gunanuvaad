import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
