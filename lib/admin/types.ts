export type AdminAllowlistRow = {
  email: string;
  invite_display_name: string | null;
  is_organizer: boolean;
  user_id: string | null;
  profile_display_name: string | null;
  avatar_url: string | null;
  has_signed_up: boolean;
  roster_ready: boolean;
};

export type AdminNoteForApprovalRow = {
  note_id: string;
  campaign_date: string;
  /** Full note text from `daily_notes.body` (RPC column name is historical). */
  body_preview: string;
  author_display_name: string;
  recipient_display_name: string;
  is_approved: boolean;
  created_at: string;
};

export type AdminGhunExportRow = {
  note_id: string;
  campaign_date: string;
  created_at: string;
  author_display_name: string;
  author_email: string;
  recipient_display_name: string;
  recipient_email: string;
  body: string;
};
