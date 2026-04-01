"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Supabase sometimes returns OAuth `?code=` on `/` itestnstead of `/auth/callback`.
 * Forwards to the route handler so the session can be exchanged.
 */
export function OAuthCallbackRecovery() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;
    const qs = searchParams.toString();
    window.location.replace(`/auth/callback?${qs}`);
  }, [searchParams]);

  return null;
}
