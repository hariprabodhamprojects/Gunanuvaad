"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { appNavItems } from "@/lib/navigation/app-nav";

/**
 * After first paint, prefetch primary tab routes so the next tap is a cache hit
 * (especially important on PWA cold start / slow devices).
 */
export function AppRouteWarmup() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const run = () => {
      for (const { href } of appNavItems) {
        router.prefetch(href);
      }
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const id = setTimeout(run, 300);
    return () => clearTimeout(id);
  }, [router]);

  return null;
}
