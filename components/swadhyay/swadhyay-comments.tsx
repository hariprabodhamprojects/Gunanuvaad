"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Heart, Pin, Send, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

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

/** Instagram-style relative time: 1m, 4h, 2d, 1w; older falls back to date. */
function formatRelativeTime(value: string) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Small text-only action button used in the meta row below each comment. */
function MetaButton({
  children,
  disabled,
  onClick,
  emphasis,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-[11px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-40",
        emphasis
          ? "text-primary hover:text-primary/80"
          : "text-foreground/55 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Compact heart button shown to the right of each comment body. */
function HeartButton({
  reacted,
  count,
  disabled,
  onClick,
  size = "md",
}: {
  reacted: boolean;
  count: number;
  disabled: boolean;
  onClick: () => void;
  size?: "md" | "sm";
}) {
  const iconSize = size === "sm" ? "size-[14px]" : "size-[16px]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={reacted ? "Remove like" : "Like"}
      aria-pressed={reacted}
      className={cn(
        "group flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-md p-1 text-[10px] font-semibold tabular-nums transition-transform active:scale-90 disabled:opacity-40 motion-reduce:active:scale-100",
        reacted ? "text-primary" : "text-foreground/55 hover:text-foreground",
      )}
    >
      <Heart
        className={cn(iconSize, "transition-transform", reacted && "scale-110")}
        strokeWidth={reacted ? 0 : 2}
        fill={reacted ? "currentColor" : "none"}
        aria-hidden
      />
      {count > 0 ? <span>{count}</span> : null}
    </button>
  );
}

export function SwadhyayComments({
  topic,
  currentUserId,
  isOrganizer,
  comments,
}: Props) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    () => new Set(),
  );
  const [pending, startTransition] = useTransition();

  const topLevel = useMemo(
    () => comments.filter((c) => !c.parent_comment_id),
    [comments],
  );
  const repliesByParent = useMemo(() => {
    const map = new Map<string, SwadhyayComment[]>();
    for (const c of comments) {
      if (!c.parent_comment_id) continue;
      const arr = map.get(c.parent_comment_id) ?? [];
      arr.push(c);
      map.set(c.parent_comment_id, arr);
    }
    return map;
  }, [comments]);
  const pinnedComment = useMemo(
    () => comments.find((c) => c.id === topic.pinned_comment_id) ?? null,
    [comments, topic.pinned_comment_id],
  );

  useLayoutEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set("[data-comment-row]", { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-comment-row]",
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.22,
          ease: "power3.out",
          stagger: 0.025,
        },
      );
    }, root);
    return () => ctx.revert();
  }, [comments.length]);

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
      setExpandedReplies((prev) => {
        const next = new Set(prev);
        next.add(replyToId);
        return next;
      });
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
        toast.error(r.error ?? "Could not save changes.");
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
      toast.success(nextPin ? "Comment pinned." : "Comment unpinned.");
      router.refresh();
    });
  };

  const toggleRepliesExpanded = (parentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  // ── Renderers ───────────────────────────────────────────────────────────

  const renderInlineEditor = (size: "md" | "sm") => (
    <div className="mt-1 space-y-1.5" data-comment-edit>
      <Textarea
        value={editingBody}
        onChange={(e) => setEditingBody(e.target.value)}
        maxLength={2000}
        disabled={pending}
        className={cn(
          size === "sm" ? "min-h-[58px] text-sm" : "min-h-[64px]",
          "rounded-lg",
        )}
      />
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setEditingBody("");
          }}
          disabled={pending}
          className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-foreground/60 hover:text-foreground disabled:opacity-40"
        >
          <X className="size-3.5" aria-hidden />
          Cancel
        </button>
        <Button
          size="sm"
          onClick={saveEdit}
          disabled={pending || !editingBody.trim()}
          className="h-7 rounded-full px-3 text-[11px]"
        >
          Save
        </Button>
      </div>
    </div>
  );

  /** Single comment (top-level or reply). Tight flex row, Instagram-style. */
  const renderCommentRow = (comment: SwadhyayComment, depth: 0 | 1) => {
    const canEdit = canEditOrDeleteComment(comment, currentUserId);
    const isEditing = editingId === comment.id;
    const isReplying = replyToId === comment.id;
    const isPinned = topic.pinned_comment_id === comment.id;
    const avatarSize = depth === 0 ? "size-8" : "size-7";
    return (
      <div className="flex items-start gap-2.5 sm:gap-3" data-comment-row>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={comment.author_avatar_url}
          alt=""
          className={cn(
            "shrink-0 rounded-full border border-border/60 object-cover",
            avatarSize,
          )}
        />
        <div className="min-w-0 flex-1">
          {isEditing ? (
            renderInlineEditor(depth === 0 ? "md" : "sm")
          ) : (
            <p className="whitespace-pre-wrap break-words text-[13.5px] leading-5 text-foreground sm:text-sm sm:leading-6">
              <span className="mr-1.5 font-semibold">
                {comment.author_display_name}
              </span>
              <span>{comment.body}</span>
            </p>
          )}
          {!isEditing ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[11px] text-foreground/50">
                {formatRelativeTime(comment.created_at)}
              </span>
              {comment.reaction_count > 0 ? (
                <span className="text-[11px] font-semibold text-foreground/65">
                  {comment.reaction_count}{" "}
                  {comment.reaction_count === 1 ? "like" : "likes"}
                </span>
              ) : null}
              {/* Replies only originate from top-level comments */}
              {depth === 0 && comment.author_id !== currentUserId ? (
                <MetaButton
                  disabled={pending}
                  onClick={() => {
                    setReplyToId(isReplying ? null : comment.id);
                    if (isReplying) setReplyBody("");
                  }}
                >
                  {isReplying ? "Cancel" : "Reply"}
                </MetaButton>
              ) : null}
              {canEdit ? (
                <>
                  <MetaButton disabled={pending} onClick={() => startEdit(comment)}>
                    Edit
                  </MetaButton>
                  <MetaButton
                    disabled={pending}
                    onClick={() => removeComment(comment.id)}
                  >
                    Delete
                  </MetaButton>
                </>
              ) : null}
              {isOrganizer && depth === 0 ? (
                <MetaButton
                  disabled={pending}
                  onClick={() => togglePin(comment.id)}
                  emphasis={isPinned}
                >
                  <span className="inline-flex items-center gap-1">
                    <Pin
                      className="size-3"
                      strokeWidth={isPinned ? 2.5 : 2}
                      aria-hidden
                    />
                    {isPinned ? "Unpin" : "Pin"}
                  </span>
                </MetaButton>
              ) : null}
            </div>
          ) : null}
        </div>
        {!isEditing ? (
          <HeartButton
            reacted={comment.viewer_reacted}
            count={comment.reaction_count}
            disabled={pending}
            onClick={() => toggleReaction(comment.id)}
            size={depth === 0 ? "md" : "sm"}
          />
        ) : null}
      </div>
    );
  };

  return (
    <div ref={listRef} className="divide-y divide-border/40">
      {/* Composer */}
      <div className="pb-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment…"
          maxLength={2000}
          disabled={pending}
          className="min-h-[44px] resize-none border-border/60 bg-background/80 text-sm placeholder:text-foreground/45"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-foreground/45 tabular-nums">
            {newComment.length}/2000
          </span>
          <Button
            size="sm"
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={submitNew}
            disabled={pending || !newComment.trim()}
          >
            <Send className="mr-1 size-3.5" aria-hidden />
            Post
          </Button>
        </div>
      </div>

      {/* Pinned (Instagram doesn't use a full card; keep it subtle) */}
      {pinnedComment ? (
        <div className="rounded-md bg-primary/5 px-2 py-2.5">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <Pin className="size-3" aria-hidden /> Pinned
          </p>
          {renderCommentRow(pinnedComment, 0)}
        </div>
      ) : null}

      {/* Feed */}
      {topLevel.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No comments yet. Be the first to write one.
        </p>
      ) : (
        <ul className="divide-y divide-border/30">
          {topLevel.map((comment) => {
            const replies = repliesByParent.get(comment.id) ?? [];
            const isExpanded = expandedReplies.has(comment.id);
            const isReplying = replyToId === comment.id;
            return (
              <li key={comment.id} className="py-3">
                {renderCommentRow(comment, 0)}

                {/* Reply composer */}
                {isReplying ? (
                  <div
                    className="mt-2 ml-10 rounded-lg border border-border/50 bg-muted/25 p-2 sm:ml-11"
                    data-comment-edit
                  >
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      maxLength={2000}
                      disabled={pending}
                      className="min-h-[52px] resize-none border-0 bg-transparent p-1 text-[13.5px] shadow-none focus-visible:ring-0 sm:text-sm"
                      placeholder={`Reply to ${comment.author_display_name}…`}
                      autoFocus
                    />
                    <div className="mt-1 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyToId(null);
                          setReplyBody("");
                        }}
                        disabled={pending}
                        className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-foreground/60 hover:text-foreground disabled:opacity-40"
                      >
                        Cancel
                      </button>
                      <Button
                        size="sm"
                        disabled={pending || !replyBody.trim()}
                        onClick={submitReply}
                        className="h-7 rounded-full px-3 text-[11px]"
                      >
                        <Send className="mr-1 size-3.5" aria-hidden />
                        Send
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Replies collapsed toggle */}
                {replies.length > 0 ? (
                  <div className="ml-10 mt-2 sm:ml-11">
                    <button
                      type="button"
                      onClick={() => toggleRepliesExpanded(comment.id)}
                      className="flex items-center gap-2 text-[11px] font-semibold text-foreground/55 transition-colors hover:text-foreground"
                    >
                      <span
                        className="inline-block h-px w-6 bg-border"
                        aria-hidden
                      />
                      {isExpanded
                        ? "Hide replies"
                        : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                    </button>

                    {isExpanded ? (
                      <ul className="mt-2 space-y-3">
                        {replies.map((reply) => (
                          <li key={reply.id}>
                            {renderCommentRow(reply, 1)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
