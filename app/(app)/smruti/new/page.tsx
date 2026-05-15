import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SmrutiComposerForm } from "@/components/smruti/smruti-composer-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";
import { cn } from "@/lib/utils";

export const metadata = { title: "New post — Smruti — MananChintan" };

export const dynamic = "force-dynamic";

export default async function SmrutiNewPage() {
  await requireAllowlistedUser();

  return (
    <div className="layout-reading pb-2">
      <header className="relative mb-4 flex items-center justify-center pt-1 sm:mb-5 sm:pt-0">
        <Link
          href="/smruti"
          aria-label="Back to Smruti"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "absolute left-0 top-1/2 -translate-y-1/2 rounded-lg sm:left-0",
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <h1 className="font-heading text-xl font-semibold tracking-tight text-primary sm:text-2xl">Smruti</h1>
      </header>

      <SmrutiComposerForm />
    </div>
  );
}
