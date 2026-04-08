import { Suspense } from "react";
import { LandingSplash } from "@/components/landing-splash";
import { OAuthCallbackRecovery } from "@/components/oauth-callback-recovery";

export const metadata = {
  title: "MananChintan",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Sign-in did not complete. Try again.",
};

/**
 * Single public entry: splash + one Google CTA. `/login` redirects here with the same query string.
 */
export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: nextParam, error: errorKey } = await searchParams;
  const redirectNext =
    typeof nextParam === "string" && nextParam.startsWith("/") ? nextParam : "/home";
  const errorMessage =
    errorKey && ERROR_MESSAGES[errorKey] ? ERROR_MESSAGES[errorKey] : errorKey
      ? "Something went wrong. Try again."
      : null;

  return (
    <Suspense fallback={null}>
      <OAuthCallbackRecovery />
      <LandingSplash redirectNext={redirectNext} errorMessage={errorMessage} />
    </Suspense>
  );
}
