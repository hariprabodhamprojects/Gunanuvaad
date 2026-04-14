"use client";

import { useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Heart, MessageCircle, Pencil, Pin, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

function IconActionButton({
  icon,
  label,
  active,
  count,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-all active:scale-95",
        "disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-primary/40 bg-primary/10 text-primary shadow-[0_4px_14px_rgba(250,115,22,0.24)]"
          : "border-border bg-card text-foreground/80 hover:border-primary/40 hover:text-primary",
      )}
    >
      {icon}
      {count && count > 0 ? <span className="tabular-nums">{count}</span> : null}
    </button>
  );
}

function HeartLikeButton({
  reacted,
  count,
  disabled,
  onClick,
}: {
  reacted: boolean;
  count: number;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={reacted ? "Remove like" : "Like"}
      aria-pressed={reacted}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-all active:scale-95",
        "disabled:pointer-events-none disabled:opacity-40",
        reacted
          ? "border-rose-500/35 bg-rose-500/10 text-rose-600 shadow-[0_6px_14px_rgba(244,63,94,0.22)]"
          : "border-border bg-card text-foreground/80 hover:border-rose-400/50 hover:text-rose-600",
      )}
    >
      <Heart
        className={cn(
          "size-[1rem] shrink-0 transition-[transform,fill]",
          reacted && "scale-105",
        )}
        strokeWidth={reacted ? 0 : 2}
        fill={reacted ? "currentColor" : "none"}
        aria-hidden
      />
      {count > 0 ? <span className="min-w-[1ch] tabular-nums leading-none">{count}</span> : null}
    </button>
  );
}

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
  const listRef = useRef<HTMLDivElement>(null);
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

  useLayoutEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-comment-card]",
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.42,
          ease: "power2.out",
          stagger: 0.06,
        },
      );
    }, root);
    return () => ctx.revert();
  }, [rows.length]);

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
    <div ref={listRef} className="space-y-4">
      {pinnedComment ? (
        <Card data-comment-card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">Pinned by admin</p>
            <p className="text-sm font-semibold">{pinnedComment.author_display_name}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{pinnedComment.body}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card data-comment-card className="border-border/80 bg-card/80">
        <CardContent className="space-y-2 p-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your reflection..."
          maxLength={2000}
          disabled={pending}
          className="min-h-[110px] resize-y"
        />
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">{newComment.length}/2000</p>
          <Button onClick={submitNew} disabled={pending || !newComment.trim()}>
            <Send className="mr-1 size-4" aria-hidden />
            Post
          </Button>
        </div>
        </CardContent>
      </Card>

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
            <Card key={comment.id} data-comment-card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
              <CardHeader className="mb-2 flex flex-row items-center gap-2 space-y-0 p-4 pb-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={comment.author_avatar_url}
                  alt=""
                  className="size-8 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{comment.author_display_name}</p>
                  <p className="text-xs text-muted-foreground/90">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
              </CardHeader>

              {isEditing ? (
                <CardContent className="space-y-2 p-4 pt-2">
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
                      <X className="mr-1 size-4" aria-hidden />
                      Cancel
                    </Button>
                    <Button onClick={saveEdit} disabled={pending || !editingBody.trim()}>
                      <Send className="mr-1 size-4" aria-hidden />
                      Save
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <>
                  <CardContent className="space-y-3 p-4 pt-2">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/95">{comment.body}</p>
                  <CardFooter className="flex flex-wrap justify-between gap-2 border-t border-border/70 px-0 pt-3 pb-0">
                    <p className="text-[11px] text-muted-foreground">Posted {new Date(comment.created_at).toLocaleString()}</p>
                    <div className="flex flex-wrap justify-end gap-2">
                    <HeartLikeButton
                      reacted={comment.viewer_reacted}
                      count={comment.reaction_count}
                      disabled={pending}
                      onClick={() => toggleReaction(comment.id)}
                    />
                    <IconActionButton
                      icon={<MessageCircle className="size-4" aria-hidden />}
                      label={comment.author_id === currentUserId ? "Cannot reply to yourself" : "Reply"}
                      disabled={pending || comment.author_id === currentUserId}
                      onClick={() => {
                        if (comment.author_id === currentUserId) {
                          toast.info("You cannot reply to your own comment.");
                          return;
                        }
                        setReplyToId(isReplying ? null : comment.id);
                        if (isReplying) setReplyBody("");
                      }}
                    />
                    {isOrganizer ? (
                      <IconActionButton
                        icon={<Pin className="size-4" aria-hidden />}
                        label={topic.pinned_comment_id === comment.id ? "Unpin" : "Pin"}
                        disabled={pending}
                        active={topic.pinned_comment_id === comment.id}
                        onClick={() => togglePin(comment.id)}
                      />
                    ) : null}
                    {canEdit ? (
                      <>
                        <IconActionButton
                          icon={<Pencil className="size-4" aria-hidden />}
                          label="Edit"
                          disabled={pending}
                          onClick={() => startEdit(comment)}
                        />
                        <IconActionButton
                          icon={<Trash2 className="size-4" aria-hidden />}
                          label="Delete"
                          disabled={pending}
                          onClick={() => removeComment(comment.id)}
                        />
                      </>
                    ) : null}
                    </div>
                  </CardFooter>
                  </CardContent>

                  {isReplying ? (
                    <div className="mt-0 space-y-2 border-t border-border/70 bg-muted/25 p-3">
                      <Textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        maxLength={2000}
                        disabled={pending}
                        className="min-h-[84px] bg-background"
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
                          <X className="mr-1 size-4" aria-hidden />
                          Cancel
                        </Button>
                        <Button size="sm" disabled={pending || !replyBody.trim()} onClick={submitReply}>
                          <Send className="mr-1 size-4" aria-hidden />
                          Reply
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {replies.length > 0 ? (
                    <div className="space-y-2 border-t border-border/70 bg-muted/20 p-3">
                      {replies.map((reply) => {
                        const canEditReply = canEditOrDeleteComment(reply, currentUserId);
                        const isReplyEditing = editingId === reply.id;
                        return (
                          <Card key={reply.id} className="border-border/70 bg-background/85 shadow-none">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
                              <p className="text-xs font-semibold">{reply.author_display_name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {new Date(reply.created_at).toLocaleString()}
                              </p>
                            </CardHeader>
                            {isReplyEditing ? (
                              <CardContent className="space-y-2 p-3 pt-0">
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
                                    <X className="mr-1 size-4" aria-hidden />
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={saveEdit} disabled={pending || !editingBody.trim()}>
                                    <Send className="mr-1 size-4" aria-hidden />
                                    Save
                                  </Button>
                                </div>
                              </CardContent>
                            ) : (
                              <CardContent className="space-y-3 p-3 pt-0">
                                <p className="whitespace-pre-wrap text-sm text-foreground/90">{reply.body}</p>
                                <CardFooter className="flex flex-wrap justify-between gap-2 border-t border-border/60 px-0 pt-2 pb-0">
                                  <p className="text-[11px] text-muted-foreground">
                                    Posted {new Date(reply.created_at).toLocaleString()}
                                  </p>
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <HeartLikeButton
                                      reacted={reply.viewer_reacted}
                                      count={reply.reaction_count}
                                      disabled={pending}
                                      onClick={() => toggleReaction(reply.id)}
                                    />
                                    {canEditReply ? (
                                      <>
                                        <IconActionButton
                                          icon={<Pencil className="size-4" aria-hidden />}
                                          label="Edit"
                                          disabled={pending}
                                          onClick={() => startEdit(reply)}
                                        />
                                        <IconActionButton
                                          icon={<Trash2 className="size-4" aria-hidden />}
                                          label="Delete"
                                          disabled={pending}
                                          onClick={() => removeComment(reply.id)}
                                        />
                                      </>
                                    ) : null}
                                  </div>
                                </CardFooter>
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
