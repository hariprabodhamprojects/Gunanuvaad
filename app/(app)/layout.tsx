import Link from "next/link";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppHeaderNav } from "@/components/app-header-nav";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { requireCompleteProfile } from "@/lib/auth/require-complete-profile";
import { getStandings } from "@/lib/standings/get-standings";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const profileName = profile?.display_name?.trim() || user.email || "You";
  const profileAvatarUrl = profile?.avatar_url?.trim() || "";
  const standings = await getStandings();
  const scoreEntry = standings?.points.find((entry) => entry.id === user.id);
  const streakEntry = standings?.streaks.find((entry) => entry.id === user.id);
  const isOrganizer = await getIsOrganizerSession();

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-full min-w-0 flex-col overflow-hidden">
      <header className="glass-header sticky top-0 z-40 w-full min-w-0 shrink-0">
        <div className="mx-auto flex w-full max-w-5xl min-w-0 items-center justify-between gap-2 px-3 py-2 sm:h-14 sm:gap-3 sm:px-4 sm:py-0">
          <Link
            href="/home"
            className="shrink-0 font-heading text-base font-semibold tracking-tight sm:text-lg"
          >
            Gunanuvad
          </Link>
          <AppHeaderNav
            email={email}
            displayName={scoreEntry?.display_name ?? profileName}
            avatarUrl={scoreEntry?.avatar_url ?? profileAvatarUrl}
            totalScore={scoreEntry?.score ?? 0}
            totalStreak={streakEntry?.streak ?? 0}
            isOrganizer={isOrganizer}
          />
        </div>
      </header>
      <main className="mx-auto flex min-h-0 w-full min-w-0 max-w-5xl flex-1 flex-col overflow-y-auto overscroll-y-none px-3 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-4">
        {children}
      </main>
      <AppBottomNav />
    </div>
  );
}
