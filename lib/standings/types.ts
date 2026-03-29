export type StandingsEntry = {
  rank: number;
  id: string;
  display_name: string;
  avatar_url: string;
  score?: number;
  streak?: number;
};

export type StandingsPayload = {
  points: StandingsEntry[];
  streaks: StandingsEntry[];
  viewer_id: string;
};
