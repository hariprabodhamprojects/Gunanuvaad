import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin workspace root when a parent folder (e.g. Desktop) has another lockfile.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
