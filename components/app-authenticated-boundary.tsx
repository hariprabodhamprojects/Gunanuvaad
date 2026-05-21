import { getAllowlistedUser } from "@/lib/auth/get-allowlisted-user";
import { requireCompleteProfile } from "@/lib/auth/require-complete-profile";

/**
 * Auth gate inside Suspense so the shell + nav can paint before Supabase RPCs finish.
 */
export async function AppAuthenticatedBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getAllowlistedUser();
  await requireCompleteProfile(user.id);
  return children;
}
