import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Composer lives on `/smruti`; keep this route for old links. */
export default function SmrutiNewRedirectPage() {
  redirect("/smruti");
}
