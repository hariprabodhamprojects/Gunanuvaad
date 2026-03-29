import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email } = await requireAllowlistedUser();

  return (
    <div className="relative flex min-h-full w-full min-w-0 flex-1 flex-col bg-app-gradient">
      <header className="glass-header sticky top-0 z-40 w-full min-w-0">
        <div className="mx-auto flex w-full max-w-lg min-w-0 items-center justify-between gap-2 px-3 py-2 sm:h-14 sm:px-4 sm:py-0">
          <Link
            href="/home"
            className="shrink-0 font-heading text-base font-semibold tracking-tight sm:text-lg"
          >
            Gunanuvad
          </Link>
          <div className="flex min-w-0 items-center justify-end gap-2">
            <span
              className="hidden min-w-0 max-w-[10rem] truncate text-xs text-muted-foreground sm:inline"
              title={email}
            >
              {email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 py-10 sm:px-4">
        {children}
      </div>
    </div>
  );
}
