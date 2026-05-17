import { SmrutiFeed } from "@/components/smruti/smruti-feed";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { getSmrutiFeed } from "@/lib/smruti/feed";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Feed — MananChintan" };

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { user } = await requireAllowlistedUser();
  const supabase = await createClient();
  const [posts, isOrganizer, profileRes] = await Promise.all([
    getSmrutiFeed({ limit: 40 }),
    getIsOrganizerSession(),
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <div className="layout-reading">
      <SmrutiFeed
        posts={posts}
        currentUserId={user.id}
        currentUserDisplayName={profileRes.data?.display_name ?? null}
        currentUserAvatarUrl={profileRes.data?.avatar_url ?? null}
        isOrganizer={isOrganizer}
      />
    </div>
  );
}
