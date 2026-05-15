import { SmrutiComposerForm } from "@/components/smruti/smruti-composer-form";
import { requireAllowlistedUser } from "@/lib/auth/require-allowlisted-user";

export const metadata = { title: "Share your Smruti — MananChintan" };

export const dynamic = "force-dynamic";

export default async function SmrutiPage() {
  await requireAllowlistedUser();

  return (
    <div className="layout-reading pb-2">
      <header className="mb-4 flex items-center justify-center pt-1 sm:mb-5 sm:pt-0">
        <h1 className="text-center font-heading text-xl font-semibold tracking-tight text-primary sm:text-2xl">
          Share your Smruti!
        </h1>
      </header>

      <SmrutiComposerForm />
    </div>
  );
}
