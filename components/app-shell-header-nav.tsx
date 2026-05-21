import { AppHeaderNav } from "@/components/app-header-nav";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { getStandings } from "@/lib/standings/get-standings";
import { createClient } from "@/lib/supabase/server";

type Props = {
  userId: string;
  email: string;
};

/** Header profile + scores — streamed so tab navigations can show `loading.tsx` in main immediately. */
export async function AppShellHeaderNav({ userId, email }: Props) {
  const supabase = await createClient();
  const [{ data: profile }, standings, isOrganizer] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    getStandings(),
    getIsOrganizerSession(),
  ]);

  const profileName = profile?.display_name?.trim() || email || "You";
  const profileAvatarUrl = profile?.avatar_url?.trim() || "";
  const scoreEntry = standings?.points.find((entry) => entry.id === userId);
  const streakEntry = standings?.streaks.find((entry) => entry.id === userId);

  return (
    <AppHeaderNav
      email={email}
      displayName={scoreEntry?.display_name ?? profileName}
      userId={userId}
      avatarUrl={profileAvatarUrl || scoreEntry?.avatar_url || ""}
      totalScore={scoreEntry?.score ?? 0}
      totalStreak={streakEntry?.streak ?? 0}
      isOrganizer={isOrganizer}
    />
  );
}
