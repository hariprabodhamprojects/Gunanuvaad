import Link from "next/link";
import { Plus, SquareStack } from "lucide-react";
import { SmrutiFeed } from "@/components/smruti/smruti-feed";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { getSmrutiFeed } from "@/lib/smruti/feed";
import { cn } from "@/lib/utils";

export const metadata = { title: "Feed — MananChintan" };

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { user } = await requireAllowlistedUser();
  const [posts, isOrganizer] = await Promise.all([getSmrutiFeed({ limit: 40 }), getIsOrganizerSession()]);

  return (
    <div className="layout-reading space-y-4 sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <SquareStack className="size-5 shrink-0 text-primary sm:size-6" aria-hidden />
            <h1 className="font-heading text-xl font-semibold tracking-tight text-primary sm:text-2xl sm:text-[28px]">
              Feed
            </h1>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:mt-1 sm:line-clamp-none sm:max-w-xl sm:text-sm">
            Everyone&apos;s Smruti posts — photos, captions, and likes. Share your own from the Smruti tab.
          </p>
        </div>
        <Link
          href="/smruti/new"
          className={cn(
            buttonVariants({ size: "default" }),
            "shrink-0 gap-1.5 self-start sm:gap-2 sm:self-center",
            "min-h-9 px-3 py-2 text-sm sm:min-h-10",
          )}
        >
          <Plus className="size-4" aria-hidden />
          New post
        </Link>
      </header>

      <SmrutiFeed posts={posts} currentUserId={user.id} isOrganizer={isOrganizer} />
    </div>
  );
}
