"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSwadhyayCommentAction,
  editSwadhyayCommentAction,
  pinSwadhyayCommentAction,
  postSwadhyayCommentAction,
  replySwadhyayCommentAction,
  toggleSwadhyayCommentReactionAction,
} from "@/lib/swadhyay/actions";
import type { SwadhyayComment, SwadhyayTopic } from "@/lib/swadhyay/types";

type Props = {
  topic: SwadhyayTopic;
  currentUserId: string;
  isOrganizer: boolean;
  comments: SwadhyayComment[];
};

const EDIT_WINDOW_MS = 15 * 60 * 1000;

function canEditOrDeleteComment(comment: SwadhyayComment, currentUserId: string) {
  if (comment.author_id !== currentUserId) return false;
  const created = new Date(comment.created_at).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= EDIT_WINDOW_MS;
}

export function SwadhyayComments({ topic, currentUserId, isOrganizer, comments }: Props) {
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => comments, [comments]);
  const topLevel = useMemo(() => rows.filter((c) => !c.parent_comment_id), [rows]);
  const repliesByParent = useMemo(() => {
    const map = new Map<string, SwadhyayComment[]>();
    for (const c of rows) {
      if (!c.parent_comment_id) continue;
      const arr = map.get(c.parent_comment_id) ?? [];
      arr.push(c);
      map.set(c.parent_comment_id, arr);
    }
    return map;
  }, [rows]);
  const pinnedComment = useMemo(
    () => rows.find((c) => c.id === topic.pinned_comment_id) ?? null,
    [rows, topic.pinned_comment_id],
  );

  const submitNew = () => {
    startTransition(async () => {
      const r = await postSwadhyayCommentAction(topic.id, newComment);
      if (!r.ok) {
        toast.error(r.error ?? "Could not post comment.");
        return;
      }
      setNewComment("");
      toast.success("Comment posted.");
      router.refresh();
    });
  };

  const submitReply = () => {
    if (!replyToId) return;
    startTransition(async () => {
      const r = await replySwadhyayCommentAction(topic.id, replyToId, replyBody);
      if (!r.ok) {
        toast.error(r.error ?? "Could not post reply.");
        return;
      }
      setReplyBody("");
      setReplyToId(null);
      toast.success("Reply posted.");
      router.refresh();
    });
  };

  const startEdit = (comment: SwadhyayComment) => {
    setEditingId(comment.id);
    setEditingBody(comment.body);
  };

  const saveEdit = () => {
    if (!editingId) return;
    startTransition(async () => {
      const r = await editSwadhyayCommentAction(editingId, editingBody);
      if (!r.ok) {
        toast.error(r.error ?? "Could not save edit.");
        return;
      }
      setEditingId(null);
      setEditingBody("");
      toast.success("Comment updated.");
      router.refresh();
    });
  };

  const removeComment = (commentId: string) => {
    startTransition(async () => {
      const r = await deleteSwadhyayCommentAction(commentId);
      if (!r.ok) {
        toast.error(r.error ?? "Could not delete comment.");
        return;
      }
      toast.success("Comment deleted.");
      router.refresh();
    });
  };

  const toggleReaction = (commentId: string) => {
    startTransition(async () => {
      const r = await toggleSwadhyayCommentReactionAction(commentId);
      if (!r.ok) {
        toast.error(r.error ?? "Could not update reaction.");
        return;
      }
      router.refresh();
    });
  };

  const togglePin = (commentId: string) => {
    startTransition(async () => {
      const nextPin = topic.pinned_comment_id === commentId ? null : commentId;
      const r = await pinSwadhyayCommentAction(topic.id, nextPin);
      if (!r.ok) {
        toast.error(r.error ?? "Could not update pin.");
        return;
      }
      toast.success(nextPin ? "Pinned comment." : "Unpinned comment.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {pinnedComment ? (
        <article className="rounded-xl border border-primary/40 bg-primary/5 p-3 sm:p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">Pinned by admin</p>
          <p className="text-sm font-semibold">{pinnedComment.author_display_name}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{pinnedComment.body}</p>
        </article>
      ) : null}

      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your reflection..."
          maxLength={2000}
          disabled={pending}
          className="min-h-[110px] resize-y"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{newComment.length}/2000</p>
          <Button onClick={submitNew} disabled={pending || !newComment.trim()}>
            Post comment
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            No comments yet. Be the first to share.
          </p>
        ) : null}

        {topLevel.map((comment) => {
          const canEdit = canEditOrDeleteComment(comment, currentUserId);
          const isEditing = editingId === comment.id;
          const replies = repliesByParent.get(comment.id) ?? [];
          const isReplying = replyToId === comment.id;
          return (
            <article key={comment.id} className="rounded-xl border border-border/60 bg-card/30 p-3 sm:p-4">
              <div className="mb-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={comment.author_avatar_url}
                  alt=""
                  className="size-8 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{comment.author_display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                    maxLength={2000}
                    disabled={pending}
                    className="min-h-[90px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditingBody("");
                      }}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveEdit} disabled={pending || !editingBody.trim()}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{comment.body}</p>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleReaction(comment.id)} disabled={pending}>
                      {comment.viewer_reacted ? "Liked" : "Like"} ({comment.reaction_count})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyToId(isReplying ? null : comment.id);
                        if (isReplying) setReplyBody("");
                      }}
                      disabled={pending}
                    >
                      Reply
                    </Button>
                    {isOrganizer ? (
                      <Button variant="outline" size="sm" onClick={() => togglePin(comment.id)} disabled={pending}>
                        {topic.pinned_comment_id === comment.id ? "Unpin" : "Pin"}
                      </Button>
                    ) : null}
                    {canEdit ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => startEdit(comment)} disabled={pending}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => removeComment(comment.id)} disabled={pending}>
                          Delete
                        </Button>
                      </>
                    ) : null}
                  </div>

                  {isReplying ? (
                    <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background/60 p-2.5">
                      <Textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        maxLength={2000}
                        disabled={pending}
                        className="min-h-[84px]"
                        placeholder={`Reply to ${comment.author_display_name}...`}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            setReplyToId(null);
                            setReplyBody("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" disabled={pending || !replyBody.trim()} onClick={submitReply}>
                          Post reply
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {replies.length > 0 ? (
                    <div className="mt-3 space-y-2 border-l-2 border-border/60 pl-3">
                      {replies.map((reply) => {
                        const canEditReply = canEditOrDeleteComment(reply, currentUserId);
                        const isReplyEditing = editingId === reply.id;
                        return (
                          <div key={reply.id} className="rounded-lg border border-border/50 bg-background/50 p-2.5">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold">{reply.author_display_name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {new Date(reply.created_at).toLocaleString()}
                              </p>
                            </div>
                            {isReplyEditing ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingBody}
                                  onChange={(e) => setEditingBody(e.target.value)}
                                  maxLength={2000}
                                  disabled={pending}
                                  className="min-h-[84px]"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditingBody("");
                                    }}
                                    disabled={pending}
                                  >
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={saveEdit} disabled={pending || !editingBody.trim()}>
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap text-sm text-foreground/90">{reply.body}</p>
                                <div className="mt-2 flex flex-wrap justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleReaction(reply.id)}
                                    disabled={pending}
                                  >
                                    {reply.viewer_reacted ? "Liked" : "Like"} ({reply.reaction_count})
                                  </Button>
                                  {canEditReply ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => startEdit(reply)}
                                        disabled={pending}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeComment(reply.id)}
                                        disabled={pending}
                                      >
                                        Delete
                                      </Button>
                                    </>
                                  ) : null}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
