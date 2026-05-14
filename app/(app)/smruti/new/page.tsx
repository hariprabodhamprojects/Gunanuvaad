import Link from "next/link";
import { ArrowLeft, Images } from "lucide-react";
import { SmrutiComposerForm } from "@/components/smruti/smruti-composer-form";
import { buttonVariants } from "@/components/ui/button";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { cn } from "@/lib/utils";

export const metadata = { title: "New post — Smruti — MananChintan" };

export const dynamic = "force-dynamic";

export default async function SmrutiNewPage() {
  await requireAllowlistedUser();

  return (
    <div className="layout-reading space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/smruti"
            aria-label="Back to Smruti"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "mt-0.5 shrink-0 rounded-lg",
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Images className="size-5 text-primary" aria-hidden />
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary sm:text-[28px]">
                New Smruti post
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Up to five photos and a caption. Likes stay forever — there is no unlike.
            </p>
          </div>
        </div>
      </header>

      <SmrutiComposerForm />
    </div>
  );
}
