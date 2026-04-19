export type SwadhyayTopic = {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_published: boolean;
  posted_by: string;
  created_at: string;
  updated_at: string;
};

/** One-level reply on a user post. Reactions + author details are denormalised. */
export type SwadhyayReply = {
  id: string;
  post_id: string;
  author_id: string;
  parent_reply_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author_display_name: string;
  author_avatar_url: string;
  reaction_count: number;
  viewer_reacted: boolean;
};

/** Top-level user reflection inside a weekly topic. */
export type SwadhyayPost = {
  id: string;
  topic_id: string;
  author_id: string;
  body: string;
  campaign_date: string;
  is_revoked: boolean;
  revoked_by: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
  updated_at: string;
  author_display_name: string;
  author_avatar_url: string;
  reaction_count: number;
  viewer_reacted: boolean;
  reply_count: number;
  /** Oldest non-deleted reply, pre-fetched to power the collapsed thread view. */
  preview_reply: SwadhyayReply | null;
};
