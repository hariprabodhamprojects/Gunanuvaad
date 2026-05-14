import { SmrutiFeed } from "@/components/smruti/smruti-feed";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { getSmrutiFeed } from "@/lib/smruti/feed";

export const metadata = { title: "Feed — MananChintan" };

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { user } = await requireAllowlistedUser();
  const [posts, isOrganizer] = await Promise.all([getSmrutiFeed({ limit: 40 }), getIsOrganizerSession()]);

  return (
    <div className="layout-reading">
      <SmrutiFeed posts={posts} currentUserId={user.id} isOrganizer={isOrganizer} />
    </div>
  );
}
