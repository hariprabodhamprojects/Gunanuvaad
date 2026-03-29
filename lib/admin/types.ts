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

export type AdminNoteForFeatureRow = {
  note_id: string;
  campaign_date: string;
  body_preview: string;
  author_display_name: string;
  recipient_display_name: string;
  is_featured: boolean;
  created_at: string;
};
