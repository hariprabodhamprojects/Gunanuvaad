import { SmrutiComposerForm } from "@/components/smruti/smruti-composer-form";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";

export const metadata = { title: "Share your Smruti — MananChintan" };

export const dynamic = "force-dynamic";

export default async function SmrutiPage() {
  await requireAllowlistedUser();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="mb-3 flex shrink-0 items-center justify-center pt-1 sm:mb-4 sm:pt-0">
        <h1 className="text-center font-heading text-xl font-semibold tracking-tight text-primary sm:text-2xl">
          Share your Smruti!
        </h1>
      </header>

      <SmrutiComposerForm className="min-h-0 flex-1" />
    </div>
  );
}
