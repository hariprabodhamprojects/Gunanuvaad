import type { User } from "@supabase/supabase-js";

/** Prefer JWT email; fall back to metadata/identities if the provider omits the top-level field. */
export function resolveSessionEmail(user: User): string | null {
  const direct = user.email?.trim();
  if (direct) return direct.toLowerCase();
  const meta = user.user_metadata?.email;
  if (typeof meta === "string" && meta.trim()) return meta.trim().toLowerCase();
  const fromIdent = user.identities?.[0]?.identity_data;
  if (fromIdent && typeof fromIdent === "object" && "email" in fromIdent) {
    const e = (fromIdent as { email?: string }).email;
    if (typeof e === "string" && e.trim()) return e.trim().toLowerCase();
  }
  return null;
}
