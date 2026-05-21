"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { appNavItems } from "@/lib/navigation/app-nav";

/**
 * Prefetch primary tab routes right after first paint so the next tap is faster.
 */
export function AppRouteWarmup() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const run = () => {
      for (const { href } of appNavItems) {
        router.prefetch(href);
      }
      router.prefetch("/calendar");
      router.prefetch("/me");
    };

    run();

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }

    const id = setTimeout(run, 1500);
    return () => clearTimeout(id);
  }, [router]);

  return null;
}
