export type SwadhyayTopic = {
  id: string;
  campaign_date: string;
  title: string;
  body: string;
  scripture_ref: string | null;
  is_published: boolean;
  pinned_comment_id: string | null;
  posted_by: string;
  created_at: string;
  updated_at: string;
};

export type SwadhyayComment = {
  id: string;
  topic_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author_display_name: string;
  author_avatar_url: string;
  reaction_count: number;
  viewer_reacted: boolean;
};
