import { RosterPickExperience } from "@/components/roster/roster-pick-experience";
import type { DailyCampaignStatus } from "@/lib/notes/daily-campaign-status";
import { getRosterMembers } from "@/lib/roster/get-roster";

type Props = {
  currentUserId: string;
  dailyCampaignStatus: DailyCampaignStatus;
};

export async function HomeRosterSection({ currentUserId, dailyCampaignStatus }: Props) {
  const members = await getRosterMembers();
  return (
    <RosterPickExperience
      members={members}
      currentUserId={currentUserId}
      dailyCampaignStatus={dailyCampaignStatus}
    />
  );
}
