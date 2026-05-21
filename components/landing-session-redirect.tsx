"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SESSION_CHECK_MS = 5_000;

type Props = {
  redirectNext: string;
};

/**
 * Returning users: redirect off the splash without blocking the server on getUser()
 * (which was hanging under launch traffic and leaving people on "loading…" forever).
 */
export function LandingSessionRedirect({ redirectNext }: Props) {
  const router = useRouter();

  useEffect(() => {
    let done = false;
    const supabase = createClient();

    const timer = window.setTimeout(() => {
      done = true;
    }, SESSION_CHECK_MS);

    void (async () => {
      try {
        const check = supabase.auth.getSession();
        const raced = await Promise.race([
          check,
          new Promise<null>((resolve) => {
            window.setTimeout(() => resolve(null), SESSION_CHECK_MS);
          }),
        ]);
        if (done || !raced?.data?.session?.user) return;
        router.replace(redirectNext);
      } catch {
        /* fail open — show sign-in splash */
      } finally {
        window.clearTimeout(timer);
      }
    })();

    return () => {
      done = true;
      window.clearTimeout(timer);
    };
  }, [redirectNext, router]);

  return null;
}
