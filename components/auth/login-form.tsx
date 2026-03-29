"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startGoogleOAuth } from "@/lib/auth/google-oauth-client";

type Props = {
  /** Post-login path when onboarding is already complete (must start with `/`). */
  redirectNext?: string;
};

/**
 * Thin wrapper — prefer landing splash on `/` for the main flow; kept for any embedded use.
 */
export function LoginForm({ redirectNext = "/home" }: Props) {
  const [pending, setPending] = useState(false);
  const next = redirectNext.startsWith("/") ? redirectNext : "/home";

  async function signInWithGoogle() {
    setPending(true);
    const r = await startGoogleOAuth(next);
    setPending(false);
    if (!r.ok) toast.error(r.message);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Button type="button" size="lg" className="w-full" disabled={pending} onClick={signInWithGoogle}>
        {pending ? "Redirecting…" : "Sign in with Google"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Use the Google account that matches your email on the invite list.
      </p>
    </div>
  );
}
