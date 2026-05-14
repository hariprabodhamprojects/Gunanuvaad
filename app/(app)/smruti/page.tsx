import Link from "next/link";
import { Images, Plus } from "lucide-react";
import { SmrutiFeed } from "@/components/smruti/smruti-feed";
import { buttonVariants } from "@/components/ui/button";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { cn } from "@/lib/utils";
import { getIsOrganizerSession } from "@/lib/auth/require-organizer";
import { getSmrutiFeed } from "@/lib/smruti/feed";

export const metadata = { title: "Smruti — MananChintan" };

export const dynamic = "force-dynamic";

export default async function SmrutiPage() {
  const { user } = await requireAllowlistedUser();
  const [posts, isOrganizer] = await Promise.all([getSmrutiFeed({ limit: 40 }), getIsOrganizerSession()]);

  return (
    <div className="layout-reading space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Images className="size-6 text-primary" aria-hidden />
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary sm:text-[28px]">
              Smruti
            </h1>
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Shared moments from the sangh — photos with a caption. Tap the heart once; it stays on.
          </p>
        </div>
        <Link
          href="/smruti/new"
          className={cn(buttonVariants({ size: "default" }), "shrink-0 gap-2 self-start sm:self-center")}
        >
          <Plus className="size-4" aria-hidden />
          New post
        </Link>
      </header>

      <SmrutiFeed posts={posts} currentUserId={user.id} isOrganizer={isOrganizer} />
    </div>
  );
}
