import { redirect } from "next/navigation";

/**
 * One entry point: `/` shows splash + Google. Preserve `next` and `error` for OAuth flows.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error: err, next: nextParam } = await searchParams;
  const q = new URLSearchParams();
  if (typeof nextParam === "string" && nextParam.startsWith("/")) {
    q.set("next", nextParam);
  }
  if (typeof err === "string" && err.length > 0) {
    q.set("error", err);
  }
  const qs = q.toString();
  redirect(qs ? `/?${qs}` : "/");
}
