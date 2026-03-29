import Link from "next/link";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppHeaderNav } from "@/components/app-header-nav";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { requireCompleteProfile } from "@/lib/auth/require-complete-profile";

export const dynamic = "force-dynamic";

/**
 * Authenticated shell — every route here runs on the server per request.
 * `requireAllowlistedUser` redirects unauthenticated or non-invited users.
 */
export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, email } = await requireAllowlistedUser();
  await requireCompleteProfile(user.id);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-1 flex-col">
      <header className="glass-header sticky top-0 z-40 w-full min-w-0">
        <div className="mx-auto flex w-full max-w-5xl min-w-0 items-center justify-between gap-2 px-3 py-2 sm:h-14 sm:gap-3 sm:px-4 sm:py-0">
          <Link
            href="/home"
            className="shrink-0 font-heading text-base font-semibold tracking-tight sm:text-lg"
          >
            Gunanuvad
          </Link>
          <AppHeaderNav email={email} />
        </div>
      </header>
      <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-3 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-4">
        {children}
      </main>
      <AppBottomNav />
    </div>
  );
}
