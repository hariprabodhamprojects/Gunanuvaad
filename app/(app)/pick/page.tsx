import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL — roster lives on `/home` now. */
export default function PickPage() {
  redirect("/home");
}
