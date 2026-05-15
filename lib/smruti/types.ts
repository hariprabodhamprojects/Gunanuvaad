export type SmrutiFeedMedia = {
  sort_order: number;
  storage_path: string;
};

export type SmrutiLikePreview = {
  avatar_url: string | null;
  display_name: string | null;
};

export type SmrutiFeedPost = {
  id: string;
  author_id: string;
  caption: string;
  created_at: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  media: SmrutiFeedMedia[];
  like_count: number;
  liked_by_me: boolean;
  like_preview: SmrutiLikePreview[];
};
