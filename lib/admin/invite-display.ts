import type { AdminAllowlistRow } from "@/lib/admin/types";

/** Primary label for an invite row (invite name → profile name → email). */
export function inviteRowLabel(row: AdminAllowlistRow): string {
  return (
    row.invite_display_name?.trim() ||
    row.profile_display_name?.trim() ||
    row.email.trim()
  );
}

export function sortInviteRows(rows: AdminAllowlistRow[]): AdminAllowlistRow[] {
  return [...rows].sort((a, b) =>
    inviteRowLabel(a).localeCompare(inviteRowLabel(b), undefined, { sensitivity: "base" }),
  );
}

export function inviteRowMatchesQuery(row: AdminAllowlistRow, query: string): boolean {
  const s = query.trim().toLowerCase();
  if (!s) return true;
  const name = inviteRowLabel(row).toLowerCase();
  const invite = (row.invite_display_name ?? "").toLowerCase();
  const profile = (row.profile_display_name ?? "").toLowerCase();
  const email = row.email.toLowerCase();
  return (
    name.includes(s) ||
    invite.includes(s) ||
    profile.includes(s) ||
    email.includes(s)
  );
}
