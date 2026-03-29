"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  /** Post-login path when onboarding is already complete (must start with `/`). */
  redirectNext?: string;
};

/**
 * Invite-only: Google OAuth, then `/auth/callback` checks `allowed_emails` for the signed-in account.
 */
export function LoginForm({ redirectNext = "/home" }: Props) {
  const [pending, setPending] = useState(false);
  const next = redirectNext.startsWith("/") ? redirectNext : "/home";

  async function signInWithGoogle() {
    setPending(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    toast.error("Could not start Google sign-in.");
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
