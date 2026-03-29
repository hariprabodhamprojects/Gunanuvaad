import { redirect } from "next/navigation";

/** @deprecated Use `/admin/approved`. */
export default function AdminFeaturedLegacyRedirect() {
  redirect("/admin/approved");
}
