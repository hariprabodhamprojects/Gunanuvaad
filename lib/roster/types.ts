export type RosterMember = {
  id: string;
  recipient_id: string | null;
  /**
   * True when this roster row can be targeted for a daily note.
   * Computed server-side so the client does not need recipient_email.
   */
  can_write: boolean;
  display_name: string;
  avatar_url: string;
  has_signed_up: boolean;
};
