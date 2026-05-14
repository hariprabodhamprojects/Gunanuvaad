import Link from "next/link";
import { Images, Plus, SquareStack } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { cn } from "@/lib/utils";

export const metadata = { title: "Smruti — MananChintan" };

export const dynamic = "force-dynamic";

/**
 * Smruti — share flow hub. The public timeline of all posts lives on `/feed`.
 */
export default async function SmrutiPage() {
  await requireAllowlistedUser();

  return (
    <div className="layout-reading space-y-5 sm:space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Images className="size-6 text-primary sm:size-7" aria-hidden />
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary sm:text-[28px]">
            Smruti
          </h1>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Post up to five photos with a caption. Likes stay on forever — there is no unlike. Browse
          everyone&apos;s posts anytime on{" "}
          <Link href="/feed" className="font-medium text-primary underline-offset-2 hover:underline">
            Feed
          </Link>
          .
        </p>
      </header>

      <Card className="border-border/60 bg-card/75 ring-border/35">
        <CardContent className="flex flex-col gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Plus className="size-5" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground">Create a post</p>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                JPEG, PNG, WebP, or GIF — up to 5 MB each. You need a short caption before publishing.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href="/smruti/new" className={cn(buttonVariants({ size: "default" }), "gap-2 sm:min-w-[10rem]")}>
              <Plus className="size-4" aria-hidden />
              New Smruti post
            </Link>
            <Link
              href="/feed"
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "gap-2 sm:min-w-[10rem]",
              )}
            >
              <SquareStack className="size-4" aria-hidden />
              Open feed
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
