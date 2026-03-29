import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in — Gunanuvad",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Sign-in did not complete. Try again.",
};

/**
 * Invite-only: Google OAuth, then allowlist check on `/auth/callback`.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error: errorKey, next: nextParam } = await searchParams;
  const redirectNext =
    typeof nextParam === "string" && nextParam.startsWith("/") ? nextParam : "/home";
  const errorMessage =
    errorKey && ERROR_MESSAGES[errorKey] ? ERROR_MESSAGES[errorKey] : errorKey
      ? "Something went wrong. Try again."
      : null;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-app-gradient px-4 py-16">
      <div className="glass-card w-full max-w-md">
        <Card className="border-0 !bg-transparent shadow-none ring-0">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl tracking-tight">Sign in</CardTitle>
            <CardDescription>
              Sign in with Google. Your Google email must be on the invite list for this group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage ? (
              <p
                className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}
            <LoginForm redirectNext={redirectNext} />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/" className="underline underline-offset-4 hover:text-foreground">
                Back to home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
