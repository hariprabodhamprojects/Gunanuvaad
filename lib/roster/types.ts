export type RosterMember = {
  id: string;
  recipient_id: string | null;
  display_name: string;
  avatar_url: string;
  has_signed_up: boolean;
};
