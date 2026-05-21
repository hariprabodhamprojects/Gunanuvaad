import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LandingSessionRedirect } from "@/components/landing-session-redirect";
import { LandingSplash } from "@/components/landing-splash";
import { OAuthCallbackRecovery } from "@/components/oauth-callback-recovery";

export const metadata = {
  title: "MananChintan",
};

// Always check the live session — never serve a stale "please sign in"
// splash from the edge to a user who is already authenticated.
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Sign-in did not complete. Try again.",
};

/**
 * Single public entry: splash + one Google CTA.
 *
 * If the user already has a valid Supabase session, send them straight to the
 * app — this is what makes the PWA feel "logged in" on every cold open instead
 * of asking the user to sign in to Google again.
 */
export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; code?: string }>;
}) {
  const { next: nextParam, error: errorKey, code } = await searchParams;
  const redirectNext =
    typeof nextParam === "string" && nextParam.startsWith("/") ? nextParam : "/home";

  // If Supabase landed an OAuth `?code=` at `/` instead of `/auth/callback`,
  // forward it server-side so the cookie is exchanged before any client work.
  if (typeof code === "string" && code.length > 0) {
    const qs = new URLSearchParams();
    qs.set("code", code);
    if (typeof nextParam === "string" && nextParam.startsWith("/")) {
      qs.set("next", nextParam);
    }
    redirect(`/auth/callback?${qs.toString()}`);
  }

  const errorMessage =
    errorKey && ERROR_MESSAGES[errorKey] ? ERROR_MESSAGES[errorKey] : errorKey
      ? "Something went wrong. Try again."
      : null;

  return (
    <Suspense fallback={null}>
      <OAuthCallbackRecovery />
      {!errorKey ? <LandingSessionRedirect redirectNext={redirectNext} /> : null}
      <LandingSplash redirectNext={redirectNext} errorMessage={errorMessage} />
    </Suspense>
  );
}
