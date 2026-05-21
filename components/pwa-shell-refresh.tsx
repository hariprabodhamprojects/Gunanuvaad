"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const BUILD_KEY = "mc-app-build-id";

/**
 * When a new deployment ships, refresh server components on next app open (common PWA stale shell issue).
 */
export function PwaShellRefresh() {
  const router = useRouter();
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
  const didRefresh = useRef(false);

  useEffect(() => {
    if (!buildId || didRefresh.current) return;

    const sync = () => {
      const prev = sessionStorage.getItem(BUILD_KEY);
      sessionStorage.setItem(BUILD_KEY, buildId);
      if (prev && prev !== buildId) {
        didRefresh.current = true;
        router.refresh();
      }
    };

    sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [buildId, router]);

  return null;
}
