export type RosterMember = {
  id: string;
  recipient_id: string | null;
  recipient_email: string | null;
  display_name: string;
  avatar_url: string;
  has_signed_up: boolean;
};
