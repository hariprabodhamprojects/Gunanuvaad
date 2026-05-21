import { getAllowlistedUser } from "@/lib/auth/get-allowlisted-user";

export type AllowlistedUser = {
  user: import("@supabase/supabase-js").User;
  email: string;
};

/** @see getAllowlistedUser — thin wrapper for call sites. */
export async function requireAllowlistedUser(): Promise<AllowlistedUser> {
  return getAllowlistedUser();
}
