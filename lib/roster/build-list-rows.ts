import type { RosterMember } from "@/lib/roster/types";

export type RosterListRow = {
  member: RosterMember;
  firstLetter: string;
  showHeader: boolean;
};

/**
 * Adds A/B/C dictionary headers for an already-sorted roster list.
 */
export function buildRosterListRows(members: RosterMember[]): RosterListRow[] {
  return members.map((member, idx) => {
    const previous = idx > 0 ? members[idx - 1] : null;
    const firstLetter = member.display_name.charAt(0).toUpperCase();
    const previousLetter = previous ? previous.display_name.charAt(0).toUpperCase() : null;
    return {
      member,
      firstLetter,
      showHeader: firstLetter !== previousLetter,
    };
  });
}
