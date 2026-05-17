import type { SwadhyayPost, SwadhyayReply } from "@/lib/swadhyay/types";

/** Client-side reaction state for optimistic like toggles. */
export type ReactionUi = {
  viewerReacted: boolean;
  reactionCount: number;
};

export function reactionUiFromPost(post: Pick<SwadhyayPost, "viewer_reacted" | "reaction_count">): ReactionUi {
  return { viewerReacted: post.viewer_reacted, reactionCount: post.reaction_count };
}

export function reactionUiFromReply(reply: Pick<SwadhyayReply, "viewer_reacted" | "reaction_count">): ReactionUi {
  return { viewerReacted: reply.viewer_reacted, reactionCount: reply.reaction_count };
}

export function toggleReactionUi(prev: ReactionUi): ReactionUi {
  if (prev.viewerReacted) {
    return {
      viewerReacted: false,
      reactionCount: Math.max(0, prev.reactionCount - 1),
    };
  }
  return {
    viewerReacted: true,
    reactionCount: prev.reactionCount + 1,
  };
}
